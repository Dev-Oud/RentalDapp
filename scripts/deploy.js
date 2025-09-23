const { ethers } = require("hardhat");
const fs = require("fs");

async function deployContract() {
  const taxPercent = 7;
  const securityFeePercent = 5;
  const oninoTokenAddress = process.env.ONINO_TOKEN_ADDRESS; // make sure this is set in your .env

  try {
    console.log("Deploying RentalDapp...");

    // ✅ Get contract factory
    const RentalDapp = await ethers.getContractFactory("RentalDapp");

    // ✅ Deploy with correct constructor args order
    const contract = await RentalDapp.deploy(
      taxPercent,
      securityFeePercent,
      oninoTokenAddress
    );

    // ✅ Wait until deployed
    await contract.waitForDeployment();

    console.log("RentalDapp deployed successfully.");
    return contract;
  } catch (error) {
    console.error("Error deploying contract:", error);
    throw error;
  }
}

async function saveContractAddress(contract) {
  try {
    // ✅ Proper way to get deployed address in ethers v6
    const deployedAddress = await contract.getAddress();

    const addressJson = JSON.stringify(
      {
        RentalDappContract: deployedAddress,
        PaymentToken: process.env.ONINO_TOKEN_ADDRESS, // 👀 save token for reference too
      },
      null,
      4
    );

    fs.writeFileSync("./contracts/contractAddress.json", addressJson, "utf8");

    console.log("Deployed contract address saved:", deployedAddress);
  } catch (error) {
    console.error("Error saving contract address:", error);
    throw error;
  }
}

async function main() {
  try {
    const contract = await deployContract();
    await saveContractAddress(contract);

    console.log("Contract deployment completed successfully.");
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exitCode = 1;
  }
}

main();
