// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Global Gold Chain (GGC) Token with Category‐Based Per‐Second Vesting
/// @notice ERC20 token where, at deployment, the owner preconfigures fixed “tokenomics” categories:
///   - Seed, Private, Public, Team, Advisors, Marketing, Airdrop, Reserve, Liquidity, Rewards, Development
/// Each category has a total pool, a TGE unlock percentage, a cliff (in “months” = SECONDS_PER_MONTH intervals),
/// and a vesting duration (also in months). Later, the owner can allocate from any category to multiple beneficiaries
/// in one transaction; each allocation uses the preconfigured parameters to calculate TGE unlock and per‐second vesting.
/// Beneficiaries then call `claim()` to receive their tokens over time. The contract is fully non‐reentrant on `claim()`.
contract GGC is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    /// @dev “Month” length for testing; adjust to `30 days` in production.
    uint256 public constant SECONDS_PER_MONTH = 1 minutes;

    /// @notice All supported categories for tokenomics
    enum Category {
        Seed,           //0
        Private,        //1
        Public,         //2
        Team,           //3    
        Advisors,       //4 
        Marketing,      //5
        Airdrop,        //6
        Reserve,        //7
        Liquidity,      //8
        Rewards,        //9
        Development     //10
    }

    /// @notice Static info for each category
    struct CategoryInfo {
        uint256 totalAmount;     // total tokens (wei) allocated to this category
        uint256 tgePercent;      // percentage (0–100) unlocked immediately at TGE
        uint256 cliffMonths;     // “months” before vesting of remainder begins
        uint256 vestingMonths;   // “months” over which remainder vests
        uint256 allocated;       // running tally of tokens already allocated from this category
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

    /// @dev Emitted when a category is initialized at deployment
    event CategoryInitialized(
        Category indexed category,
        uint256 totalAmount,
        uint256 tgePercent,
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

    /// @dev Emitted when a beneficiary claims vested tokens
    event TokensClaimed(address indexed beneficiary, uint256 amount, uint256 timestamp);

    /// @dev Emitted when the owner moves an allocation from one address to another
    event AddressChanged(address indexed oldAddress, address indexed newAddress);

    /// @dev Emitted if the owner rescues tokens sent accidentally to this contract
    event EmergencyWithdraw(address indexed to, uint256 amount);

    /// @notice Upon deployment, mint 1 billion GGC to this contract and initialize all categories
    constructor() ERC20("Grand Gagsta City", "GGC") Ownable(msg.sender) {
        // Mint entire 1 billion supply to the contract itself
        _mint(address(this), 1_000_000_000 * 10**decimals());

        // Initialize each category with its tokenomic parameters:
        // (totalAmount, tgePercent, cliffMonths, vestingMonths)

        // Seed: 16% → 160 000 000 tokens, 10% TGE, 3‐month cliff, 12‐month vesting
        categories[Category.Seed] = CategoryInfo({
            totalAmount: 160_000_000 * 10**decimals(),
            tgePercent: 10,
            cliffMonths: 3,
            vestingMonths: 12,
            allocated: 0
        });
        emit CategoryInitialized(Category.Seed, 160_000_000 * 10**decimals(), 10, 3, 12);

        // Private: 5% → 50 000 000 tokens, 15% TGE, 3‐month cliff, 12‐month vesting
        categories[Category.Private] = CategoryInfo({
            totalAmount: 50_000_000 * 10**decimals(),
            tgePercent: 15,
            cliffMonths: 3,
            vestingMonths: 12,
            allocated: 0
        });
        emit CategoryInitialized(Category.Private, 50_000_000 * 10**decimals(), 15, 3, 12);

        // Public: 13% → 130 000 000 tokens, 40% TGE, 1‐month cliff, 4‐month vesting
        categories[Category.Public] = CategoryInfo({
            totalAmount: 130_000_000 * 10**decimals(),
            tgePercent: 40,
            cliffMonths: 1,
            vestingMonths: 4,
            allocated: 0
        });
        emit CategoryInitialized(Category.Public, 130_000_000 * 10**decimals(), 40, 1, 4);

        // Team: 10% → 100 000 000 tokens, 0% TGE, 6‐month cliff, 36‐month vesting
        categories[Category.Team] = CategoryInfo({
            totalAmount: 100_000_000 * 10**decimals(),
            tgePercent: 0,
            cliffMonths: 6,
            vestingMonths: 36,
            allocated: 0
        });
        emit CategoryInitialized(Category.Team, 100_000_000 * 10**decimals(), 0, 6, 36);

        // Advisors: 6% → 60 000 000 tokens, 5% TGE, 4‐month cliff, 24‐month vesting
        categories[Category.Advisors] = CategoryInfo({
            totalAmount: 60_000_000 * 10**decimals(),
            tgePercent: 5,
            cliffMonths: 4,
            vestingMonths: 24,
            allocated: 0
        });
        emit CategoryInitialized(Category.Advisors, 60_000_000 * 10**decimals(), 5, 4, 24);

        // Marketing: 10% → 100 000 000 tokens, 3% TGE, 3‐month cliff, 48‐month vesting
        categories[Category.Marketing] = CategoryInfo({
            totalAmount: 100_000_000 * 10**decimals(),
            tgePercent: 3,
            cliffMonths: 3,
            vestingMonths: 48,
            allocated: 0
        });
        emit CategoryInitialized(Category.Marketing, 100_000_000 * 10**decimals(), 3, 3, 48);

        // Airdrop: 2% → 20 000 000 tokens, 10% TGE, 0‐month cliff, 5‐month vesting
        categories[Category.Airdrop] = CategoryInfo({
            totalAmount: 20_000_000 * 10**decimals(),
            tgePercent: 10,
            cliffMonths: 0,
            vestingMonths: 5,
            allocated: 0
        });
        emit CategoryInitialized(Category.Airdrop, 20_000_000 * 10**decimals(), 10, 0, 5);

        // Reserve: 3% → 30 000 000 tokens, 0% TGE, 8‐month cliff, 64‐month vesting
        categories[Category.Reserve] = CategoryInfo({
            totalAmount: 30_000_000 * 10**decimals(),
            tgePercent: 0,
            cliffMonths: 8,
            vestingMonths: 64,
            allocated: 0
        });
        emit CategoryInitialized(Category.Reserve, 30_000_000 * 10**decimals(), 0, 8, 64);

        // Liquidity: 15% → 150 000 000 tokens, 100% TGE, 0‐month cliff, 0‐month vesting
        categories[Category.Liquidity] = CategoryInfo({
            totalAmount: 150_000_000 * 10**decimals(),
            tgePercent: 100,
            cliffMonths: 0,
            vestingMonths: 0,
            allocated: 0
        });
        emit CategoryInitialized(Category.Liquidity, 150_000_000 * 10**decimals(), 100, 0, 0);

        // Rewards: 15% → 150 000 000 tokens, 0.1% TGE, 0‐month cliff, 72‐month vesting
        categories[Category.Rewards] = CategoryInfo({
            totalAmount: 150_000_000 * 10**decimals(),
            tgePercent: 1, // 0.1% expressed as integer? We interpret “0.1%” by storing 1 with 1 decimal place? 
                            // In solidity / integer math, we treat as 1 / 1000 fraction? 
                            // But for exactness, we define tgePercent=1 here to represent 0.1%. Contract does integer division totalAmount * tgePercent / 1000.
                            // To accommodate decimals, adjust below in code. We'll handle 0.1% by dividing by 1000 instead of 100.
            cliffMonths: 0,
            vestingMonths: 72,
            allocated: 0
        });
        emit CategoryInitialized(Category.Rewards, 150_000_000 * 10**decimals(), 1, 0, 72);

        // Development: 5% → 50 000 000 tokens, 0% TGE, 3‐month cliff, 36‐month vesting
        categories[Category.Development] = CategoryInfo({
            totalAmount: 50_000_000 * 10**decimals(),
            tgePercent: 0,
            cliffMonths: 3,
            vestingMonths: 36,
            allocated: 0
        });
        emit CategoryInitialized(Category.Development, 50_000_000 * 10**decimals(), 0, 3, 36);
    }

    /// @notice Owner allocates multiple beneficiaries from a given category in one transaction
    /// @dev For “Rewards” category, tgePercent=1 represents 0.1%; handled specially.
    /// @param category Category from which to allocate
    /// @param beneficiaries Array of recipient addresses
    /// @param amounts Array of token amounts (in whole GGC, not wei) to allocate to each
    function allocateBatch(
        Category category,
        address[] calldata beneficiaries,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(beneficiaries.length == amounts.length, "GGC: array length mismatch");
        CategoryInfo storage cat = categories[category];

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            uint256 amountTokens = amounts[i] * 10**decimals(); // convert whole GGC → wei

            require(beneficiary != address(0), "GGC: zero beneficiary");
            require(cat.allocated + amountTokens <= cat.totalAmount, "GGC: exceeds category pool");
            require(allocations[beneficiary].total == 0, "GGC: beneficiary already has allocation");

            // Mark as allocated from this category
            cat.allocated += amountTokens;

            // Compute TGE unlock: if category == Rewards, use /1000 for 0.1%; otherwise /100
            uint256 tgeUnlockAmount;
            if (category == Category.Rewards) {
                // 0.1% → divide by 1000
                tgeUnlockAmount = (amountTokens * cat.tgePercent) / 1000;
            } else {
                tgeUnlockAmount = (amountTokens * cat.tgePercent) / 100;
            }

            // Determine cliff and vesting parameters
            uint256 cliffM = cat.cliffMonths;
            uint256 vestM = cat.vestingMonths;

            // Compute remainder after TGE
            uint256 remainder = amountTokens - tgeUnlockAmount;

            // Compute per‐second vesting rate
            uint256 perSecond = 0;
            if (vestM > 0) {
                uint256 totalVestingSeconds = vestM * SECONDS_PER_MONTH;
                require(totalVestingSeconds > 0, "GGC: invalid vesting duration");
                perSecond = remainder / totalVestingSeconds;
            }

            // Create Allocation
            allocations[beneficiary] = Allocation({
                total: amountTokens,
                tgeUnlock: tgeUnlockAmount,
                cliffMonths: cliffM,
                vestingMonths: vestM,
                claimPerSecond: perSecond,
                claimed: 0,
                startTimestamp: block.timestamp
            });

            emit AllocationSet(
                category,
                beneficiary,
                amountTokens,
                tgeUnlockAmount,
                cliffM,
                vestM,
                perSecond,
                block.timestamp
            );
        }
    }

    /// @notice Beneficiary calls to claim vested tokens
    /// @dev nonReentrant. See Allocation struct for details.
    function claim() external nonReentrant {
        Allocation storage a = allocations[msg.sender];
        require(a.total > 0, "GGC: no allocation");

        uint256 nowTs = block.timestamp;

        // 1) Vesting not started if before startTimestamp
        if (nowTs < a.startTimestamp) {
            revert("GGC: vesting not started");
        }

        // 2) TGE portion unlocked
        uint256 unlockedAtTGE = a.tgeUnlock;
        uint256 remainder = a.total - unlockedAtTGE;

        // 3) Compute how much of remainder has vested so far
        uint256 vestedFromRemainder = 0;
        uint256 cliffEnd = a.startTimestamp + (a.cliffMonths * SECONDS_PER_MONTH);

        if (nowTs >= cliffEnd) {
            uint256 vestingEnd = cliffEnd + (a.vestingMonths * SECONDS_PER_MONTH);
            if (nowTs >= vestingEnd) {
                // fully vested
                vestedFromRemainder = remainder;
            } else {
                // partial: seconds since cliff
                uint256 secondsSinceCliff = nowTs - cliffEnd;
                vestedFromRemainder = secondsSinceCliff * a.claimPerSecond;
                if (vestedFromRemainder > remainder) {
                    vestedFromRemainder = remainder;
                }
            }
        }

        // 4) Total vested = TGE + vested remainder
        uint256 totalVested = unlockedAtTGE + vestedFromRemainder;

        // 5) Claimable = totalVested - already claimed
        uint256 claimable = totalVested - a.claimed;
        require(claimable > 0, "GGC: nothing to claim");

        // 6) Update state then transfer from this contract
        a.claimed += claimable;
        _transfer(address(this), msg.sender, claimable);

        emit TokensClaimed(msg.sender, claimable, nowTs);
    }

    /// @notice Owner can move an allocation from one address to another
    /// @dev Copies all fields so vesting continues seamlessly
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
}
