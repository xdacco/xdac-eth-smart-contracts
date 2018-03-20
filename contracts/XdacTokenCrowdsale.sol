pragma solidity ^0.4.13;

import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./XdacToken.sol";
/**
 * @title XdacTokenCrowdsale
 */
contract XdacTokenCrowdsale is Ownable {

    using SafeMath for uint256;
    uint256[] roundGoals;
    uint256[] roundRates;
    uint256 minContribution;

    // The token being sold
    ERC20 public token;

    // Address where funds are collected
    address public wallet;

    mapping(address => Contributor) public contributors;
    //Array of the addresses who participated
    address[] addresses;

    // Amount of wei raised
    uint256 public weiDelivered;


    event TokenRefund(address indexed purchaser, uint256 amount);
    event TokenPurchase(address indexed purchaser, address indexed contributor, uint256 value, uint256 amount);

    struct Contributor {
        uint256 eth;
        bool whitelisted;
        bool created;
    }


    function XdacTokenCrowdsale(
        address _wallet,
        uint256[] _roundGoals,
        uint256[] _roundRates,
        uint256 _minContribution
    ) public {
        require(_wallet != address(0));
        require(_roundRates.length == 5);
        require(_roundGoals.length == 5);
        roundGoals = _roundGoals;
        roundRates = _roundRates;
        minContribution = _minContribution;
        token = new XdacToken();
        wallet = _wallet;
    }

    // -----------------------------------------
    // Crowdsale external interface
    // -----------------------------------------

    /**
     * @dev fallback function
     */
    function () external payable {
        buyTokens(msg.sender);
    }

    /**
     * @dev token purchase
     * @param _contributor Address performing the token purchase
     */
    function buyTokens(address _contributor) public payable {
        require(_contributor != address(0));
        require(msg.value != 0);
        require(msg.value >= minContribution);
        require(weiDelivered.add(msg.value) <= roundGoals[4]);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(msg.value);

        TokenPurchase(msg.sender, _contributor, msg.value, tokens);
        _forwardFunds();
    }

    /**********internal***********/
    function _getCurrentRound() internal view returns (uint) {
        for (uint i = 0; i < 5; i++) {
            if (weiDelivered < roundGoals[i]) {
                return i;
            }
        }
    }

    /**
     * @dev the way in which ether is converted to tokens.
     * @param _weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
        uint curRound = _getCurrentRound();
        uint256 calculatedTokenAmount = 0;
        uint256 roundWei = 0;
        uint256 weiRaisedIntermediate = weiDelivered;
        uint256 weiAmount = _weiAmount;

        for (curRound; curRound < 5; curRound++) {
            if (weiRaisedIntermediate.add(weiAmount) > roundGoals[curRound]) {
                roundWei = roundGoals[curRound].sub(weiRaisedIntermediate);
                weiRaisedIntermediate = weiRaisedIntermediate.add(roundWei);
                weiAmount = weiAmount.sub(roundWei);
                calculatedTokenAmount = calculatedTokenAmount.add(roundWei.mul(roundRates[curRound]));
            }
            else {
                calculatedTokenAmount = calculatedTokenAmount.add(weiAmount.mul(roundRates[curRound]));
                break;
            }
        }
        return calculatedTokenAmount;
    }


    /**
     * @dev the way in which tokens is converted to ether.
     * @param _tokenAmount Value in token to be converted into wei
     * @return Number of ether that required to purchase with the specified _tokenAmount
     */
    function _getEthAmount(uint256 _tokenAmount) internal view returns (uint256) {
        uint curRound = _getCurrentRound();
        uint256 calculatedWeiAmount = 0;
        uint256 roundWei = 0;
        uint256 weiRaisedIntermediate = weiDelivered;
        uint256 tokenAmount = _tokenAmount;

        for (curRound; curRound < 5; curRound++) {
            if(weiRaisedIntermediate.add(tokenAmount.div(roundRates[curRound])) > roundGoals[curRound]) {
                roundWei = roundGoals[curRound].sub(weiRaisedIntermediate);
                weiRaisedIntermediate = weiRaisedIntermediate.add(roundWei);
                tokenAmount = tokenAmount.sub(roundWei.div(roundRates[curRound]));
                calculatedWeiAmount = calculatedWeiAmount.add(tokenAmount.div(roundRates[curRound]));
            }
            else {
                calculatedWeiAmount = calculatedWeiAmount.add(tokenAmount.div(roundRates[curRound]));
                break;
            }
        }

        return calculatedWeiAmount;
    }

    function _forwardFunds() internal {
        Contributor storage contributor = contributors[msg.sender];
        contributor.eth = contributor.eth.add(msg.value);
        if (contributor.created == false) {
            contributor.created = true;
            addresses.push(msg.sender);
        }
        if (contributor.whitelisted) {
            _deliverTokens(msg.sender);
        }
    }

    function _deliverTokens(address _contributor) internal {
        Contributor storage contributor = contributors[_contributor];
        uint256 amountEth = contributor.eth;
        uint256 amountToken = _getTokenAmount(amountEth);
        require(amountToken > 0);
        require(amountEth > 0);
        require(contributor.whitelisted);
        contributor.eth = 0;
        weiDelivered = weiDelivered.add(amountEth);
        wallet.transfer(amountEth);
        token.transfer(_contributor, amountToken);
    }

    function _refundTokens(address _contributor) internal {
        Contributor storage contributor = contributors[_contributor];
        uint256 ethAmount = contributor.eth;
        require(ethAmount > 0);
        contributor.eth = 0;
        TokenRefund(_contributor, ethAmount);
        _contributor.transfer(ethAmount);
    }

    function _whitelistAddress(address _contributor) internal {
        Contributor storage contributor = contributors[_contributor];
        contributor.whitelisted = true;
        if (contributor.created == false) {
            contributor.created = true;
            addresses.push(_contributor);
        }
        //Auto deliver tokens
        if (contributor.eth > 0) {
            _deliverTokens(_contributor);
        }
    }

    /**********************owner*************************/

    function whitelistAddresses(address[] _contributors) public onlyOwner {
        for (uint256 i = 0; i < _contributors.length; i++) {
            _whitelistAddress(_contributors[i]);
        }
    }


    function whitelistAddress(address _contributor) public onlyOwner {
        _whitelistAddress(_contributor);
    }

    function transferTokenOwnership(address _newOwner) public onlyOwner returns(bool success) {
        XdacToken _token = XdacToken(token);
        _token.transfer(_newOwner, _token.balanceOf(_token.owner()));
        _token.transferOwnership(_newOwner);
        return true;
    }

    /**
     * @dev Refound tokens. For owner
     */
    function refundTokensForAddress(address _contributor) public onlyOwner {
        _refundTokens(_contributor);
    }


    /**********************contributor*************************/

    function getAddresses() public onlyOwner view returns (address[] )  {
        return addresses;
    }

    /**
    * @dev Refound tokens. For contributors
    */
    function refundTokens() public {
        _refundTokens(msg.sender);
    }
    /**
     * @dev Returns tokens according to rate
     */
    function getTokenAmount(uint256 _weiAmount) public view returns (uint256) {
        return _getTokenAmount(_weiAmount);
    }

    /**
     * @dev Returns ether according to rate
     */
    function getEthAmount(uint256 _tokenAmount) public view returns (uint256) {
        return _getEthAmount(_tokenAmount);
    }

    function getCurrentRate() public view returns (uint256) {
        return roundRates[_getCurrentRound()];
    }
}
