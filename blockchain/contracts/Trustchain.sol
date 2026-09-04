// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Trustchain
 * @dev A transparent donation platform that uses milestones and community voting for fund release.
 */
contract Trustchain {
    struct Campaign {
        address ngo;
        string title;
        uint256 goalAmount;
        uint256 raisedAmount;
        uint256 milestoneCount;
        uint256 currentMilestone;
        bool isCompleted;
        bool exists;
    }

    struct Milestone {
        string description;
        string proofIpfsHash;
        uint256 votesFor;
        uint256 votesAgainst;
        bool isApproved;
        bool isClaimed;
    }

    mapping(uint256 => Campaign) public campaigns;
    // campaignId => milestoneId => Milestone
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    uint256 public campaignCount;

    event CampaignCreated(uint256 indexed campaignId, address indexed ngo, string title, uint256 goalAmount);
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event MilestoneSubmitted(uint256 indexed campaignId, uint256 indexed milestoneId, string proofIpfsHash);
    event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneId);
    event FundsReleased(uint256 indexed campaignId, uint256 indexed milestoneId, uint256 amount);

    modifier onlyNGO(uint256 _campaignId) {
        require(campaigns[_campaignId].ngo == msg.sender, "Only NGO can perform this action");
        _;
    }

    function createCampaign(string memory _title, uint256 _goalAmount, uint256 _milestoneCount) public {
        campaignCount++;
        campaigns[campaignCount] = Campaign({
            ngo: msg.sender,
            title: _title,
            goalAmount: _goalAmount,
            raisedAmount: 0,
            milestoneCount: _milestoneCount,
            currentMilestone: 0,
            isCompleted: false,
            exists: true
        });
        emit CampaignCreated(campaignCount, msg.sender, _title, _goalAmount);
    }

    function donate(uint256 _campaignId) public payable {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.isCompleted, "Campaign is completed");
        require(msg.value > 0, "Donation must be greater than 0");

        campaign.raisedAmount += msg.value;
        emit DonationReceived(_campaignId, msg.sender, msg.value);
    }

    function submitMilestone(uint256 _campaignId, string memory _description, string memory _proofIpfsHash) public onlyNGO(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.currentMilestone < campaign.milestoneCount, "All milestones submitted");
        
        campaign.currentMilestone++;
        milestones[_campaignId][campaign.currentMilestone] = Milestone({
            description: _description,
            proofIpfsHash: _proofIpfsHash,
            votesFor: 0,
            votesAgainst: 0,
            isApproved: false,
            isClaimed: false
        });
        
        emit MilestoneSubmitted(_campaignId, campaign.currentMilestone, _proofIpfsHash);
    }

    function voteMilestone(uint256 _campaignId, uint256 _milestoneId, bool _support) public {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        Milestone storage milestone = milestones[_campaignId][_milestoneId];
        require(bytes(milestone.description).length > 0, "Milestone does not exist");
        require(!milestone.isApproved, "Milestone already approved");

        if (_support) {
            milestone.votesFor++;
        } else {
            milestone.votesAgainst++;
        }
        
        // Auto-approve if votesFor > 5 (Simple logic for demo)
        if (milestone.votesFor > 5) {
            approveMilestone(_campaignId, _milestoneId);
        }
    }

    function approveMilestone(uint256 _campaignId, uint256 _milestoneId) public {
        // In a production environment, this would be restricted to an admin or a DAO vote result
        Milestone storage milestone = milestones[_campaignId][_milestoneId];
        require(!milestone.isApproved, "Already approved");
        
        milestone.isApproved = true;
        emit MilestoneApproved(_campaignId, _milestoneId);
    }

    function releaseFunds(uint256 _campaignId, uint256 _milestoneId) public onlyNGO(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        Milestone storage milestone = milestones[_campaignId][_milestoneId];
        
        require(milestone.isApproved, "Milestone not approved");
        require(!milestone.isClaimed, "Funds already claimed");
        
        uint256 amountToRelease = campaign.raisedAmount / campaign.milestoneCount;
        require(address(this).balance >= amountToRelease, "Insufficient balance in contract");
        
        milestone.isClaimed = true;
        payable(campaign.ngo).transfer(amountToRelease);
        
        if (campaign.currentMilestone == campaign.milestoneCount && milestone.isApproved) {
            campaign.isCompleted = true;
        }
        
        emit FundsReleased(_campaignId, _milestoneId, amountToRelease);
    }

    function getCampaign(uint256 _campaignId) public view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getMilestone(uint256 _campaignId, uint256 _milestoneId) public view returns (Milestone memory) {
        return milestones[_campaignId][_milestoneId];
    }
}
