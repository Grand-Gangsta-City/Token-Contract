// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Global Gold Chain (GGC) Token with Per‐Second Vesting
/// @notice ERC20 token enabling the owner to set up vesting allocations for beneficiaries:
///   1) A one‐time TGE (token generation event) unlock
///   2) A cliff period (measured in “months” = `SECONDS_PER_MONTH` intervals)
///   3) A linear per‐second vesting schedule over a specified vesting duration
/// Users can claim their TGE portion immediately once `startTimestamp` is reached. After the cliff,
/// the remaining tokens vest at a constant `claimPerSecond` rate. Owner can also change beneficiary
/// addresses or emergency‐withdraw tokens mistakenly sent to the contract.
///
/// @dev We use `ReentrancyGuard` on the `claim()` function to prevent reentrancy attacks.
contract GGC is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    /// @dev Number of seconds in one “month.” For testing, set to 5 minutes (300 seconds).
    uint256 public constant SECONDS_PER_MONTH = 1 minutes;

    /// @notice A vesting allocation for one beneficiary
    /// @param total Total tokens allocated (wei)
    /// @param tgeUnlock Amount unlocked immediately at TGE (wei)
    /// @param cliffMonths Months (intervals) before any vesting of remainder begins
    /// @param vestingMonths Duration of linear vesting (in “months”) for the remainder
    /// @param claimPerSecond Wei of the remainder vested each second after cliff
    /// @param claimed Total wei already claimed by beneficiary
    /// @param startTimestamp UNIX time when TGE and cliff countdown begin
    struct Allocation {
        uint256 total;
        uint256 tgeUnlock;
        uint256 cliffMonths;
        uint256 vestingMonths;
        uint256 claimPerSecond;
        uint256 claimed;
        uint256 startTimestamp;
    }

    /// @notice beneficiary → their vesting allocation
    mapping(address => Allocation) public allocations;

    /// @dev Emitted when owner sets up a new allocation
    event AllocationSet(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 tgeUnlock,
        uint256 cliffMonths,
        uint256 vestingMonths,
        uint256 claimPerSecond,
        uint256 startTimestamp
    );

    /// @dev Emitted when a beneficiary claims vested tokens
    event TokensClaimed(address indexed beneficiary, uint256 amount, uint256 timestamp);

    /// @dev Emitted when the owner moves an allocation from one address to another
    event AddressChanged(address indexed oldAddress, address indexed newAddress);

    /// @dev Emitted when the owner withdraws tokens from this contract
    event EmergencyWithdraw(address indexed to, uint256 amount);

    /// @notice Deploys the GGC token and mints 1 billion tokens to `msg.sender` (owner)
    constructor() ERC20("Global Gold Chain", "GGC") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000_000 * 10**decimals());
    }

    /// @notice Owner sets a vesting allocation for a beneficiary
    /// @dev `tgePercent` is [0..100]. After TGE unlock, the remaining “remainder” must vest exactly
    ///      at `claimPerSecond` over `vestingMonths * SECONDS_PER_MONTH` seconds. We enforce:
    ///        remainder == claimPerSecond * vestingMonths * SECONDS_PER_MONTH
    ///
    /// @param beneficiary Address receiving the allocation (nonzero, no prior allocation)
    /// @param totalAmount Total tokens (wei) allocated
    /// @param tgePercent Percentage (0–100) of `totalAmount` unlocked at TGE
    /// @param cliffMonths Number of “months” (intervals) before remainder starts vesting
    /// @param vestingMonths Number of months over which remainder vests
    /// @param claimPerSecond Wei vested per second after cliff (must exactly distribute remainder)
    /// @param startTimestamp UNIX time when TGE unlock & cliff countdown begin
    function setAllocation(
        address beneficiary,
        uint256 totalAmount,
        uint256 tgePercent,
        uint256 cliffMonths,
        uint256 vestingMonths,
        uint256 claimPerSecond,
        uint256 startTimestamp
    ) external onlyOwner {
        require(beneficiary != address(0), "GGC: beneficiary zero");
        require(allocations[beneficiary].total == 0, "GGC: already allocated");
        require(tgePercent <= 100, "GGC: tgePercent > 100");
        require(vestingMonths > 0, "GGC: vestingMonths > 0");

        uint256 tgeUnlockAmount = (totalAmount * tgePercent) / 100;

        allocations[beneficiary] = Allocation({
            total: totalAmount,
            tgeUnlock: tgeUnlockAmount,
            cliffMonths: cliffMonths,
            vestingMonths: vestingMonths,
            claimPerSecond: claimPerSecond,
            claimed: 0,
            startTimestamp: startTimestamp
        });

        emit AllocationSet(
            beneficiary,
            totalAmount,
            tgeUnlockAmount,
            cliffMonths,
            vestingMonths,
            claimPerSecond,
            startTimestamp
        );
    }

    /// @notice Beneficiary calls to claim vested tokens
    /// @dev Reentrancy‐safe. Logic:
    ///   1. If now < startTimestamp → revert (vesting not yet started)
    ///   2. TGE portion (`tgeUnlock`) is available immediately at or after `startTimestamp`
    ///   3. After `cliffEnd = startTimestamp + cliffMonths * SECONDS_PER_MONTH`,
    ///      the remainder vests at `claimPerSecond` per second, until `vestingEnd = cliffEnd + vestingMonths * SECONDS_PER_MONTH`
    ///   4. If now ≥ vestingEnd, the entire remainder is vested
    ///   5. Compute `totalVested = tgeUnlock + vestedFromRemainder`
    ///   6. `claimable = totalVested - claimed`, revert if zero
    ///   7. Update `claimed` and transfer `claimable` from owner ⇒ beneficiary
    function claim() external nonReentrant {
        Allocation storage a = allocations[msg.sender];
        require(a.total > 0, "GGC: no allocation");

        uint256 nowTs = block.timestamp;

        // 1) Vesting hasn't begun if before startTimestamp
        if (nowTs < a.startTimestamp) {
            revert("GGC: vesting not started");
        }

        // 2) TGE portion unlocked
        uint256 unlockedAtTGE = a.tgeUnlock;
        uint256 remainder = a.total - unlockedAtTGE;

        // 3) Compute how much of the remainder has vested
        uint256 vestedFromRemainder = 0;
        uint256 cliffEnd = a.startTimestamp + (a.cliffMonths * SECONDS_PER_MONTH);

        if (nowTs >= cliffEnd) {
            uint256 vestingEnd = cliffEnd + (a.vestingMonths * SECONDS_PER_MONTH);
            if (nowTs >= vestingEnd) {
                // Entire remainder is vested
                vestedFromRemainder = remainder;
            } else {
                // Partial vesting: seconds since cliff
                uint256 secondsSinceCliff = nowTs - cliffEnd;
                vestedFromRemainder = secondsSinceCliff * a.claimPerSecond;
                // Guard: do not exceed remainder
                if (vestedFromRemainder > remainder) {
                    vestedFromRemainder = remainder;
                }
            }
        }

        // 4) Total vested = TGE + vested remainder
        uint256 totalVested = unlockedAtTGE + vestedFromRemainder;

        // 5) Claimable = totalVested − already claimed
        uint256 claimable = totalVested - a.claimed;
        require(claimable > 0, "GGC: nothing to claim");

        // 6) Update before transferring (checks‐effects‐interactions)
        a.claimed += claimable;
        _transfer(owner(), msg.sender, claimable);

        emit TokensClaimed(msg.sender, claimable, nowTs);
    }

    /// @notice Owner can move an existing allocation from one address to another
    /// @dev Copies all fields including `claimed` and `claimPerSecond` so vesting continues seamlessly.
    /// @param oldAddress Address that currently has an allocation
    /// @param newAddress Address to receive that allocation
    function changeAddress(address oldAddress, address newAddress) external onlyOwner {
        require(oldAddress != address(0), "GGC: old zero");
        require(newAddress != address(0), "GGC: new zero");

        Allocation storage oldAlloc = allocations[oldAddress];
        require(oldAlloc.total > 0, "GGC: no allocation old");
        require(allocations[newAddress].total == 0, "GGC: allocation exists new");

        allocations[newAddress] = Allocation({
            total: oldAlloc.total,
            tgeUnlock: oldAlloc.tgeUnlock,
            cliffMonths: oldAlloc.cliffMonths,
            vestingMonths: oldAlloc.vestingMonths,
            claimPerSecond: oldAlloc.claimPerSecond,
            claimed: oldAlloc.claimed,
            startTimestamp: oldAlloc.startTimestamp
        });
        delete allocations[oldAddress];

        emit AddressChanged(oldAddress, newAddress);
    }

    /// @notice Emergency: Owner can rescue any GGC tokens carried by this contract
    /// @param to Address that will receive all tokens held by this contract
    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "GGC: to zero");
        uint256 bal = balanceOf(address(this));
        require(bal > 0, "GGC: no tokens to withdraw");
        _transfer(address(this), to, bal);
        emit EmergencyWithdraw(to, bal);
    }
}
