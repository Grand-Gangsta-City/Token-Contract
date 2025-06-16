// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title Grand Gangsta City (GGC) Token with Category‐Based Per‐Second Vesting

/// @notice ERC20 token where, at deployment, the owner preconfigures fixed “tokenomics” categories:
///   - Seed, Private, Public, Team, Advisors, Marketing, Airdrop, Reserve, Liquidity, Rewards, Development
/// Each category has a total pool, a TGE unlock percentage, a cliff (in “months” = SECONDS_PER_MONTH intervals),
/// and a vesting duration (also in months). Later, the owner can allocate from any category to multiple beneficiaries
/// in one transaction; each allocation uses the preconfigured parameters to calculate TGE unlock and per‐second vesting.
/// Beneficiaries then call `claim()` to receive their tokens over time. The contract is fully non‐reentrant on `claim()`.
/// vested tokens over time.  `changeAddress(...)` now also requires on‐chain user consent.
contract GGC is ERC20, ERC20Burnable, Ownable2Step {
    /// @dev “Month” length for testing; set to 30 days in production.
    uint256 public constant SECONDS_PER_MONTH = 30 days;

    /// @dev Basis points denominator: 1 bps = 0.01%, 10 000 bps = 100%.
    uint16  public constant BPS_DENOMINATOR = 10_000;

    /// @notice All supported categories
    enum Category {
        Seed,           // 0
        Private,        // 1
        Public,         // 2
        Team,           // 3
        Advisors,       // 4
        Marketing,      // 5
        Airdrop,        // 6
        Reserve,        // 7
        Liquidity,      // 8
        Rewards,        // 9
        Development     // 10
    }

    /// @notice Static tokenomic parameters per category
    struct CategoryInfo {
        uint256 totalAmount;  // total tokens (wei) allocated to this category
        uint16  tgeBps;       // TGE unlock % in bps (0–10 000)
        uint256 cliffMonths;  // “months” before vesting of remainder begins
        uint256 vestingMonths;// “months” over which remainder vests
        uint256 allocated;    // running tally of tokens already allocated from this category
    }

    /// @notice Per‐beneficiary vesting allocation
    struct Allocation {
        uint256 total;           // total tokens (wei) allocated to this beneficiary
        uint256 tgeUnlock;       // amount unlocked at TGE (wei)
        uint256 cliffMonths;     // cliff in months
        uint256 vestingMonths;   // vesting duration in months
        uint256 claimPerSecond;  // wei unlocked per second after cliff
        uint256 claimed;         // wei already claimed
        uint256 startTimestamp;  // UNIX time when TGE begins (and cliff countdown)
    }

    /// @dev Mapping from Category → its static info
    mapping(Category => CategoryInfo) public categories;

    /// @dev Mapping from beneficiary address → their vesting Allocation
    mapping(address => Allocation) public allocations;

    /// @dev Tracks which addresses have approved an admin‐driven migration
    mapping(address => bool) public addressChangeApproved;

    /// @dev Emitted once per category at deployment
    event CategoryInitialized(
        Category indexed category,
        uint256 totalAmount,
        uint16  tgeBps,
        uint256 cliffMonths,
        uint256 vestingMonths
    );

    /// @dev Emitted when the owner allocates tokens from a category to beneficiaries
    event AllocationSet(
        Category indexed category,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 tgeUnlock,
        uint256 cliffMonths,
        uint256 vestingMonths,
        uint256 claimPerSecond,
        uint256 startTimestamp
    );

    /// @dev Emitted on each successful `claim()`
    event TokensClaimed(address indexed beneficiary, uint256 amount, uint256 timestamp);

    /// @dev Emitted when owner successfully migrates an allocation
    event AddressChanged(address indexed oldAddress, address indexed newAddress);

    /// @notice Deploy & initialize all 11 categories
    constructor() ERC20("Grand Gangsta City", "GGC") Ownable(msg.sender) {
        // Mint 1 billion GGC directly into this contract
        _mint(address(this), 1_000_000_000 * 10**decimals());  

        _initCategory(Category.Seed,       160_000_000, 1000, 3,  12);  // 10.00% TGE
        _initCategory(Category.Private,     50_000_000,  1500, 3, 12);  // 15.00%
        _initCategory(Category.Public,      130_000_000, 10000, 0,  0); // This will be transffered to launchpads and they will lock themselves    40% on TGE 1 month cliff 4 months vesting
        _initCategory(Category.Team,       100_000_000,    0, 6, 36);  //  0.00%
        _initCategory(Category.Advisors,     60_000_000,  500, 4, 24);  //  5.00%
        _initCategory(Category.Marketing,   100_000_000,  300, 3, 48);  //  3.00%
        _initCategory(Category.Airdrop,      20_000_000, 1000, 0,  5);  // 10.00%
        _initCategory(Category.Reserve,      30_000_000,    0, 8, 64);  //  0.00%
        _initCategory(Category.Liquidity,   150_000_000, 10000,0,  0);  //100.00%
        _initCategory(Category.Rewards,     150_000_000,   10, 0, 72);  //  0.10%
        _initCategory(Category.Development,  50_000_000,    0, 3, 36);  //  0.00%
    }

    /// @dev Helper to reduce copy/paste in constructor
    function _initCategory(
        Category cat,
        uint256  millions,
        uint16   bps,
        uint256  cliffM,
        uint256  vestM
    ) internal {
        uint256 tokens = millions * 10**decimals();
        categories[cat] = CategoryInfo({
            totalAmount: tokens,
            tgeBps:      bps,
            cliffMonths: cliffM,
            vestingMonths: vestM,
            allocated:   0
        });
        emit CategoryInitialized(cat, tokens, bps, cliffM, vestM);
    }

    /// @notice Owner allocates multiple recipients in one tx
    /// @param category     which pool to draw from
    /// @param beneficiaries list of addresses
    /// @param amounts      list of GGC‐units (not wei!) per address
    function allocateBatch(
        Category category,
        address[] calldata beneficiaries,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(beneficiaries.length == amounts.length, "GGC: length mismatch");
        CategoryInfo storage cat = categories[category];

        for (uint256 i; i < beneficiaries.length; i++) {
            address to = beneficiaries[i];
            require(to != address(0), "GGC: zero address");

            // convert whole‐GGC → wei
            uint256 amtWei = amounts[i] * 10**decimals();
            require(cat.allocated + amtWei <= cat.totalAmount, "GGC: pool exhausted");
            require(allocations[to].total == 0, "GGC: already has alloc");

            // mark allocated
            cat.allocated += amtWei;

            // uniform TGE unlock formula:
            uint256 tge = (amtWei * cat.tgeBps) / BPS_DENOMINATOR;
            uint256 rem = amtWei - tge;

            // per‐second vesting rate
            uint256 perSec;
            if (cat.vestingMonths > 0) {
                perSec = rem / (cat.vestingMonths * SECONDS_PER_MONTH);
            }

            allocations[to] = Allocation({
                total:          amtWei,
                tgeUnlock:      tge,
                cliffMonths:    cat.cliffMonths,
                vestingMonths:  cat.vestingMonths,
                claimPerSecond: perSec,
                claimed:        0,
                startTimestamp: block.timestamp
            });

            emit AllocationSet(
                category,
                to,
                amtWei,
                tge,
                cat.cliffMonths,
                cat.vestingMonths,
                perSec,
                block.timestamp
            );
        }
    }

    /// @notice Claim whatever has vested (TGE + per-second after cliff)
    function claim() external {
        Allocation storage a = allocations[msg.sender];
        require(a.total > 0, "GGC: no allocation");

        uint256 nowTs = block.timestamp;
        require(nowTs >= a.startTimestamp, "GGC: not started");

        // compute vested:
        uint256 vested = a.tgeUnlock;
        uint256 rem = a.total - vested;
        uint256 cliffTs = a.startTimestamp + (a.cliffMonths * SECONDS_PER_MONTH);

        if (nowTs >= cliffTs) {
            uint256 vestEnd = cliffTs + (a.vestingMonths * SECONDS_PER_MONTH);
            if (nowTs >= vestEnd) {
                vested += rem;
            } else {
                vested += (nowTs - cliffTs) * a.claimPerSecond;
            }
        }

        if (vested > a.total) vested = a.total; // safety

        uint256 claimable = vested - a.claimed;
        require(claimable > 0, "GGC: nothing to claim");

        a.claimed += claimable;
        _transfer(address(this), msg.sender, claimable);

        emit TokensClaimed(msg.sender, claimable, nowTs);
    }

    /// @notice Beneficiary opts in to let the owner migrate their allocation
    function approveAddressChange() external {
        require(allocations[msg.sender].total > 0, "GGC: no alloc");
        addressChangeApproved[msg.sender] = true;
    }

    /// @notice Revoke prior migration approval
    function revokeAddressChangeApproval() external {
        addressChangeApproved[msg.sender] = false;
    }

    /// @notice Owner migrates an allocation—but *only* after user approved on-chain!
    function changeAddress(address oldAddr, address newAddr) external onlyOwner {
        require(oldAddr != address(0) && newAddr != address(0), "GGC: zero addr");
        Allocation storage oldA = allocations[oldAddr];
        require(oldA.total > 0, "GGC: no alloc old");
        require(allocations[newAddr].total == 0, "GGC: alloc exists new");
        require(addressChangeApproved[oldAddr], "GGC: no user approval");

        allocations[newAddr] = Allocation({
            total:          oldA.total,
            tgeUnlock:      oldA.tgeUnlock,
            cliffMonths:    oldA.cliffMonths,
            vestingMonths:  oldA.vestingMonths,
            claimPerSecond: oldA.claimPerSecond,
            claimed:        oldA.claimed,
            startTimestamp: oldA.startTimestamp
        });
        delete allocations[oldAddr];
        addressChangeApproved[oldAddr] = false;

        emit AddressChanged(oldAddr, newAddr);
    }
}
