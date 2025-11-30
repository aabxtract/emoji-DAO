// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DAOVoting
 * @dev A simple DAO voting contract based on proof of stake
 * Voting power is proportional to staked tokens
 */
contract DAOVoting is ReentrancyGuard {
    
    // Governance token
    IERC20 public governanceToken;
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool cancelled;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) votingPower; // Snapshot of voting power
    }
    
    // Staking data
    mapping(address => uint256) public stakedBalance;
    uint256 public totalStaked;
    
    // Proposals
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    // Governance parameters
    uint256 public votingPeriod = 3 days;
    uint256 public minStakeToPropose = 1000 * 10**18; // 1000 tokens
    uint256 public quorumPercentage = 10; // 10% of total staked tokens
    
    // Vote options
    enum VoteOption { Against, For, Abstain }
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        VoteOption voteOption,
        uint256 votingPower
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    /**
     * @dev Constructor
     * @param _governanceToken The token used for staking and voting
     */
    constructor(address _governanceToken) {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = IERC20(_governanceToken);
    }
    
    /**
     * @dev Stake tokens to gain voting power
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        
        require(
            governanceToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot unstake 0");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");
        
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        
        require(
            governanceToken.transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Create a new proposal
     * @param title Proposal title
     * @param description Proposal description
     */
    function createProposal(
        string memory title,
        string memory description
    ) external returns (uint256) {
        require(
            stakedBalance[msg.sender] >= minStakeToPropose,
            "Insufficient stake to propose"
        );
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.executed = false;
        proposal.cancelled = false;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            proposal.startTime,
            proposal.endTime
        );
        
        return proposalId;
    }
    
    /**
     * @dev Vote on a proposal
     * @param proposalId The proposal ID
     * @param voteOption Vote choice (0=Against, 1=For, 2=Abstain)
     */
    function vote(uint256 proposalId, VoteOption voteOption) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(stakedBalance[msg.sender] > 0, "No voting power");
        
        uint256 votingPower = stakedBalance[msg.sender];
        proposal.hasVoted[msg.sender] = true;
        proposal.votingPower[msg.sender] = votingPower;
        
        if (voteOption == VoteOption.For) {
            proposal.forVotes += votingPower;
        } else if (voteOption == VoteOption.Against) {
            proposal.againstVotes += votingPower;
        } else {
            proposal.abstainVotes += votingPower;
        }
        
        emit Voted(proposalId, msg.sender, voteOption, votingPower);
    }
    
    /**
     * @dev Execute a proposal if it passed
     * @param proposalId The proposal ID
     */
    function executeProposal(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp > proposal.endTime, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorum = (totalStaked * quorumPercentage) / 100;
        
        require(totalVotes >= quorum, "Quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");
        
        proposal.executed = true;
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal (only proposer)
     * @param proposalId The proposal ID
     */
    function cancelProposal(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(msg.sender == proposal.proposer, "Only proposer can cancel");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Already cancelled");
        
        proposal.cancelled = true;
        
        emit ProposalCancelled(proposalId);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        bool cancelled
    ) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        return (
            proposal.id,
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.cancelled
        );
    }
    
    /**
     * @dev Check if address has voted on proposal
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        return proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Get voting power used by address on proposal
     */
    function getVotingPowerUsed(uint256 proposalId, address voter) external view returns (uint256) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        return proposals[proposalId].votingPower[voter];
    }
    
    /**
     * @dev Check if proposal is active
     */
    function isProposalActive(uint256 proposalId) external view returns (bool) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        return block.timestamp >= proposal.startTime &&
               block.timestamp <= proposal.endTime &&
               !proposal.executed &&
               !proposal.cancelled;
    }
    
    /**
     * @dev Check if proposal passed
     */
    function hasProposalPassed(uint256 proposalId) external view returns (bool) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (block.timestamp <= proposal.endTime) {
            return false; // Still voting
        }
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorum = (totalStaked * quorumPercentage) / 100;
        
        return totalVotes >= quorum && proposal.forVotes > proposal.againstVotes;
    }
    
    /**
     * @dev Get proposal results
     */
    function getProposalResults(uint256 proposalId) external view returns (
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 totalVotes,
        uint256 forPercentage,
        uint256 quorumReached,
        bool passed
    ) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorum = (totalStaked * quorumPercentage) / 100;
        
        forPercentage = totalVotes > 0 ? (proposal.forVotes * 100) / totalVotes : 0;
        
        passed = block.timestamp > proposal.endTime &&
                 totalVotes >= quorum &&
                 proposal.forVotes > proposal.againstVotes;
        
        return (
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            totalVotes,
            forPercentage,
            quorum,
            passed
        );
    }
    
    /**
     * @dev Get user's current voting power
     */
    function getVotingPower(address user) external view returns (uint256) {
        return stakedBalance[user];
    }
}
