const { faker } = require("@faker-js/faker");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const toWei = (num) => ethers.parseEther(num.toString());

const dataCount = 5;
const fixedPrice = 0.5; // 👈 fixed price in ONINO
const imagesUrls = [
  "https://a0.muscache.com/im/pictures/miso/Hosting-3524556/original/24e9b114-7db5-4fab-8994-bc16f263ad1d.jpeg?im_w=720",
  "https://a0.muscache.com/im/pictures/miso/Hosting-5264493/original/10d2c21f-84c2-46c5-b20b-b51d1c2c971a.jpeg?im_w=720",
  "https://a0.muscache.com/im/pictures/prohost-api/Hosting-584469386220279136/original/227d4c26-43d5-42da-ad84-d039515c0bad.jpeg?im_w=720",
  "https://a0.muscache.com/im/pictures/miso/Hosting-610511843622686196/original/253bfa1e-8c53-4dc0-a3af-0a75728c0708.jpeg?im_w=720",
  "https://a0.muscache.com/im/pictures/miso/Hosting-535385560957380751/original/90cc1db6-d31c-48d5-80e8-47259e750d30.jpeg?im_w=720",
];

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const generateFakeApartment = async (count, signer) => {
  const apartments = [];
  for (let i = 0; i < count; i++) {
    const id = i + 1;
    const name = faker.word.words(3);
    const description = faker.lorem.paragraph();
    const location = faker.location.city();
    const price = fixedPrice; // 👈 use fixed 0.5 ONINO
    const rooms = faker.number.int({ min: 2, max: 5 });
    const images = [];

    for (let j = 0; j < 5; j++) {
      images.push(shuffleArray(imagesUrls)[0]);
    }

    apartments.push({
      id,
      name,
      description,
      location,
      price: toWei(price),
      images: images.join(", "),
      rooms,
      owner: signer.address, // 👈 restored
      timestamp: Math.floor(Date.now() / 1000), // 👈 restored
      deleted: false, // 👈 restored
    });
  }
  return apartments;
};

async function createApartments(contract, apartment) {
  const tx = await contract.createAppartment(
    apartment.name,
    apartment.description,
    apartment.location,
    apartment.images,
    apartment.rooms,
    apartment.price,
    // 👇 still not passing owner, timestamp, deleted
    {
      gasLimit: 3_000_000,
      gasPrice: ethers.parseUnits("20", "gwei"),
    }
  );
  await tx.wait();
  console.log(`✅ Apartment created: ${apartment.name} @ 0.5 ONINO`);
  await delay(3000);
}

async function bookApartments(contract, token, apartment) {
  const now = Math.floor(Date.now() / 1000);
  const dates = [now + 86400, now + 2 * 86400, now + 3 * 86400]; // next 3 days

  // Approve token transfer
  const approveTx = await token.approve(await contract.getAddress(), apartment.price);
  await approveTx.wait();
  console.log(`🔑 Approved ${ethers.formatEther(apartment.price)} ONINO for booking ID ${apartment.id}`);

  // Book
  const tx = await contract.bookApartment(apartment.id, dates, {
    gasLimit: 3_000_000,
    gasPrice: ethers.parseUnits("20", "gwei"),
  });
  await tx.wait();

  console.log(`📖 Apartment booked: ID ${apartment.id}`);
  await delay(3000);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  try {
    // Load deployed RentalDapp address
    const filePath = path.join(__dirname, "../contracts/contractAddress.json");
    const contractAddresses = fs.readFileSync(filePath, "utf8");
    const { RentalDappContract: rentalAddress } = JSON.parse(contractAddresses);

    console.log("📄 Loaded contract address:", rentalAddress);

    const [signer] = await ethers.getSigners();
    const RentalDappContract = await ethers.getContractAt("RentalDapp", rentalAddress);

    // ✅ Use .env for ONINO token address
    const ONINO_TOKEN_ADDRESS = process.env.ONINO_TOKEN_ADDRESS;
    if (!ONINO_TOKEN_ADDRESS) {
      throw new Error("❌ ONINO_TOKEN_ADDRESS not set in .env");
    }

    const OninoToken = await ethers.getContractAt("IERC20", ONINO_TOKEN_ADDRESS);

    const apartments = await generateFakeApartment(dataCount, signer);

    console.log("🌱 Seeding apartments...");

    for (const apartment of apartments) {
      await createApartments(RentalDappContract, apartment);
    }

    console.log("✅ All apartments created!");

    // Book each apartment
    for (const apartment of apartments) {
      await bookApartments(RentalDappContract, OninoToken, apartment);
    }

    console.log("🎉 Dummy data seeded successfully!");
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exitCode = 1;
  }
}

main();
