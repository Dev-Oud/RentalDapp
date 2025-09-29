const { faker } = require('@faker-js/faker')
const { ethers } = require('hardhat')
const fs = require('fs')

const toWei = (num) => ethers.parseEther(num.toString())
const dataCount = 5
const maxPrice = 3.5

const imagesUrls = [
  'https://a0.muscache.com/im/pictures/miso/Hosting-3524556/original/24e9b114-7db5-4fab-8994-bc16f263ad1d.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/miso/Hosting-5264493/original/10d2c21f-84c2-46c5-b20b-b51d1c2c971a.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/prohost-api/Hosting-584469386220279136/original/227d4c26-43d5-42da-ad84-d039515c0bad.jpeg?im_w=720',
  'https://a0.muscache.com/im/pictures/miso/Hosting-610511843622686196/original/253bfa1e-8c53-4dc0-a3af-0a75728c0708.jpeg?im_w=720',
]

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

const generateFakeApartment = (count) => {
  const apartments = []
  for (let i = 0; i < count; i++) {
    const name = faker.word.words(5)
    const description = faker.lorem.paragraph()
    const location = faker.location.city()
    const rooms = faker.number.int({ min: 2, max: 5 })
    const price = faker.number.float({ min: 0.1, max: maxPrice, precision: 0.01 })

    const images = []
    for (let j = 0; j < 3; j++) {
      images.push(shuffleArray(imagesUrls)[0])
    }

    apartments.push({
      name,
      description,
      location,
      price: toWei(price),
      images: images.join(', '),
      rooms,
    })
  }
  return apartments
}

async function createApartments(contract, apartment) {
  const tx = await contract.createApartment(
    apartment.name,
    apartment.description,
    apartment.location,
    apartment.images,
    apartment.rooms,
    apartment.price
  )
  await tx.wait()
}

async function bookApartments(contract, aid, dates) {
  const [signer] = await ethers.getSigners()
  const userAddress = await signer.getAddress()

  const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
  ]

  const paymentToken = await contract.paymentToken()
  console.log('Payment token set to:', paymentToken)

  const token = await ethers.getContractAt(ERC20_ABI, paymentToken, signer)

  const apt = await contract.getApartment(aid)
  const totalRequired = apt.price * BigInt(dates.length)

  const contractAddress = await contract.getAddress()
  const allowance = await token.allowance(userAddress, contractAddress)

  if (allowance < totalRequired) {
    const approveTx = await token.approve(contractAddress, totalRequired)
    await approveTx.wait()
    console.log(`Approved ${totalRequired.toString()} tokens`)
  }

  const tx = await contract.bookApartment(aid, dates)
  await tx.wait()
}

async function getApartments(contract) {
  const apartments = await contract.getApartments()
  console.log(apartments)
}

async function main() {
  try {
    const contractAddress = fs.readFileSync('./contracts/contractAddress.json')
    const { RentalDappContract: RentalDappAddress } = JSON.parse(contractAddress)

    const RentalDappContract = await ethers.getContractAt('RentalDapp', RentalDappAddress)
    const dates = [Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 86400]

    // create apartments
    for (const apt of generateFakeApartment(dataCount)) {
      await createApartments(RentalDappContract, apt)
    }

    // book first apartment
    await bookApartments(RentalDappContract, 1, dates)

    await getApartments(RentalDappContract)

    console.log('Dummy data seeded successfully...')
  } catch (error) {
    console.error('Unhandled error:', error)
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exitCode = 1
})
