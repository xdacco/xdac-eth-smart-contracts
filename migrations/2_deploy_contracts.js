const XdacTokenCrowdsale = artifacts.require("./XdacTokenCrowdsale.sol")
const BigNumber = web3.BigNumber;

function ether(n) {
  return new BigNumber(web3.toWei(n, 'ether'));
}

module.exports = function(deployer, network, accounts) {

  const _roundGoals = [
    ether(1400),
    ether(9900),
    ether(18400),
    ether(26900),
    ether(35400)
  ]

  const _roundRates = [
    new BigNumber(12500),
    new BigNumber(12000),
    new BigNumber(11500),
    new BigNumber(11000),
    new BigNumber(10500)
  ]

  const _minContribution = ether(0.1)

  const wallet = accounts[0]

  deployer.deploy(
    XdacTokenCrowdsale, wallet, _roundGoals, _roundRates, _minContribution
  );

};
