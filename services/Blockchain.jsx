// src/blockchain.js
import { ethers } from 'ethers'
import { store } from '@/store'
import { globalActions } from '@/store/globalSlices'
import address from '@/contracts/contractAddress.json'
import RentalDappAbi from '@/artifacts/contracts/RentalDapp.sol/RentalDapp.json'

const { setBookings, setTimestamps, setReviews } = globalActions

// ethers v6 helpers
const toWei = (num) => ethers.parseEther(num.toString()) // returns BigInt
const fromWei = (num) => ethers.formatEther(num) // returns string

// minimal ERC-20 ABI used for allowance/approve/decimals
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
]

/**
 * Get contract instance
 * withSigner = true -> returns contract connected to user's signer (wallet)
 * withSigner = false -> returns contract connected to a read-only JSON-RPC provider
 */
const getContract = async (withSigner = false) => {
  // contract address key in your address JSON (adjust if necessary)
  const contractAddress = address.RentalDappContract || address.dappBnbContract

  if (withSigner && typeof window !== 'undefined' && window.ethereum) {
    // Browser wallet (MetaMask / injected)
    const provider = new ethers.BrowserProvider(window.ethereum)
    // prompt for accounts if not already authorized
    try {
      await provider.send('eth_requestAccounts', [])
    } catch (err) {
      // user refused or provider error
      throw new Error('Wallet connection required')
    }
    const signer = await provider.getSigner()
    return new ethers.Contract(contractAddress, RentalDappAbi.abi, signer)
  }

  // fallback read-only provider
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpctestnet.onino.io'
  const provider = new ethers.JsonRpcProvider(rpc)
  return new ethers.Contract(contractAddress, RentalDappAbi.abi, provider)
}

/* ------------------- READ FUNCTIONS ------------------- */

const getApartments = async () => {
  const contract = await getContract(false)
  const apartments = await contract.getApartments()
  return structureAppartments(apartments)
}

const getApartment = async (id) => {
  const contract = await getContract(false)
  const apt = await contract.getApartment(id)
  return structureAppartments([apt])[0]
}

const getBookings = async (id) => {
  const contract = await getContract(false)
  const bookings = await contract.getBookings(id)
  return structuredBookings(bookings)
}

const getQualifiedReviewers = async (id) => {
  const contract = await getContract(false)
  return await contract.getQualifiedReviewers(id)
}

const getReviews = async (id) => {
  const contract = await getContract(false)
  const reviews = await contract.getReviews(id)
  return structuredReviews(reviews)
}

const getBookedDates = async (id) => {
  const contract = await getContract(false)
  const dates = await contract.getUnavailableDates(id)
  return dates.map((ts) => Number(ts))
}

const getSecurityFee = async () => {
  const contract = await getContract(false)
  const fee = await contract.securityFee()
  return Number(fee) // percentage
}

/* ------------------- WRITE FUNCTIONS ------------------- */

/**
 * createApartment / update / delete are unchanged (they don't involve token transfers)
 */
const createApartment = async (apartment) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.createAppartment(
      apartment.name,
      apartment.description,
      apartment.location,
      apartment.images,
      apartment.rooms,
      toWei(apartment.price) // pass BigInt
    )
    await tx.wait()
    return tx
  } catch (error) {
    return Promise.reject(error)
  }
}

const updateApartment = async (apartment) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.updateAppartment(
      apartment.id,
      apartment.name,
      apartment.description,
      apartment.location,
      apartment.images,
      apartment.rooms,
      toWei(apartment.price)
    )
    await tx.wait()
    return tx
  } catch (error) {
    return Promise.reject(error)
  }
}

const deleteApartment = async (aid) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.deleteAppartment(aid)
    await tx.wait()
    return tx
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * bookApartment (ERC20 flow)
 *  - reads apartment.price (per-night) from contract (token smallest unit)
 *  - computes total required = totalRent + securityDeposit
 *  - ensures user approved the contract to spend required tokens
 *  - calls contract.bookApartment(aid, timestamps) (no native value)
 */
const bookApartment = async ({ aid, timestamps }) => {
  try {
    const contract = await getContract(true)
    const signer = contract.signer
    const userAddress = await signer.getAddress()
    const contractAddress = contract.target || contract.address // BrowserProvider returns .target in some contexts

    // get payment token address from contract
    const paymentTokenAddress = await contract.paymentToken()
    if (!paymentTokenAddress || paymentTokenAddress === ethers.ZeroAddress) {
      throw new Error('Payment token not configured on contract')
    }

    // read per-night price (BigInt) from contract
    const apt = await contract.getApartment(aid)
    const perNight = BigInt(apt.price) // already in token smallest units (BigInt)
    const nights = BigInt(timestamps.length)

    // compute totals
    const totalRent = perNight * nights
    const securityPercent = BigInt(await contract.securityFee()) // integer percent
    const deposit = (totalRent * securityPercent) / BigInt(100)
    const totalRequired = totalRent + deposit

    // token contract (connected to signer)
    const token = new ethers.Contract(paymentTokenAddress, ERC20_ABI, signer)

    // check allowance
    const allowance = await token.allowance(userAddress, contractAddress)
    if (BigInt(allowance) < BigInt(totalRequired)) {
      // approve required amount (you could alternatively approve a large allowance to avoid repeated approvals)
      const approveTx = await token.approve(contractAddress, totalRequired)
      await approveTx.wait()
    }

    // call booking (contract will call safeTransferFrom to pull tokens)
    const tx = await contract.bookApartment(aid, timestamps)
    await tx.wait()

    // refresh booked dates in app state
    const bookedDates = await getBookedDates(aid)
    store.dispatch(setTimestamps(bookedDates))

    return tx
  } catch (error) {
    return Promise.reject(error)
  }
}

const checkInApartment = async (aid, bookingId) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.checkInApartment(aid, bookingId)
    await tx.wait()
    const bookings = await getBookings(aid)
    store.dispatch(setBookings(bookings))
    return tx
  } catch (error) {
    return Promise.reject(error)
  }
}

const refundBooking = async (aid, bookingId) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.refundBooking(aid, bookingId)
    await tx.wait()
    const bookings = await getBookings(aid)
    store.dispatch(setBookings(bookings))
    return tx
  } catch (error) {
    return Promise.reject(error)
  }
}

const addReview = async (aid, comment) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.addReview(aid, comment)
    await tx.wait()
    const reviews = await getReviews(aid)
    store.dispatch(setReviews(reviews))
    return tx
  } catch (error) {
    return Promise.reject(error)
  }
}

/* ------------------- HELPERS / STRUCTURERS ------------------- */

const structureAppartments = (appartments) =>
  appartments.map((appartment) => ({
    id: Number(appartment.id),
    name: appartment.name,
    owner: appartment.owner,
    description: appartment.description,
    location: appartment.location,
    // keep price as string (safe) — convert to number only where UI expects it
    price: fromWei(appartment.price),
    deleted: appartment.deleted,
    images: appartment.images ? String(appartment.images).split(',') : [],
    rooms: Number(appartment.rooms),
    timestamp: Number(appartment.timestamp),
    booked: appartment.booked,
  }))

const structuredBookings = (bookings) =>
  bookings.map((booking) => ({
    id: Number(booking.id),
    aid: Number(booking.aid),
    tenant: booking.tenant,
    date: Number(booking.date),
    price: fromWei(booking.price),
    checked: booking.checked,
    cancelled: booking.cancelled,
  }))

const structuredReviews = (reviews) =>
  reviews.map((review) => ({
    id: Number(review.id),
    aid: Number(review.aid),
    text: review.reviewText,
    owner: review.owner,
    timestamp: Number(review.timestamp),
  }))

export {
  getApartments,
  getApartment,
  getBookings,
  getBookedDates,
  createApartment,
  updateApartment,
  deleteApartment,
  bookApartment,
  checkInApartment,
  refundBooking,
  addReview,
  getReviews,
  getQualifiedReviewers,
  getSecurityFee,
}
