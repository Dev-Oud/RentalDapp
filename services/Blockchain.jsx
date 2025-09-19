// src/blockchain.js
import { ethers } from "ethers"
import { store } from "@/store"
import { globalActions } from "@/store/globalSlices"
import address from "@/contracts/contractAddress.json"
import RentalDappAbi from "@/artifacts/contracts/RentalDapp.sol/RentalDapp.json"

const { setBookings, setTimestamps, setReviews } = globalActions

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

// 🔑 Helper to get contract instance
const getContract = async (withSigner = false) => {
  if (withSigner) {
    if (!window.ethereum) throw new Error("MetaMask not found")
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    await provider.send("eth_requestAccounts", [])
    const signer = provider.getSigner()
    return new ethers.Contract(address.RentalDappContract, RentalDappAbi.abi, signer)
  } else {
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "https://rpctestnet.onino.io"
    )
    return new ethers.Contract(address.RentalDappContract, RentalDappAbi.abi, provider)
  }
}

// ------------------- READ FUNCTIONS -------------------
const getApartments = async () => {
  const contract = await getContract()
  const apartments = await contract.getApartments()
  return structureAppartments(apartments)
}

const getApartment = async (id) => {
  const contract = await getContract()
  const apartment = await contract.getApartment(id)
  return structureAppartments([apartment])[0]
}

const getBookings = async (id) => {
  const contract = await getContract()
  const bookings = await contract.getBookings(id)
  return structuredBookings(bookings)
}

const getQualifiedReviewers = async (id) => {
  const contract = await getContract()
  return await contract.getQualifiedReviewers(id)
}

const getReviews = async (id) => {
  const contract = await getContract()
  const reviewers = await contract.getReviews(id)
  return structuredReviews(reviewers)
}

const getBookedDates = async (id) => {
  const contract = await getContract()
  const bookings = await contract.getUnavailableDates(id)
  return bookings.map((timestamp) => Number(timestamp))
}

const getSecurityFee = async () => {
  const contract = await getContract()
  const fee = await contract.securityFee()
  return Number(fee)
}

// ------------------- WRITE FUNCTIONS -------------------
const createApartment = async (apartment) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.createAppartment(
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

const bookApartment = async ({ aid, timestamps, amount }) => {
  try {
    const contract = await getContract(true)
    const tx = await contract.bookApartment(aid, timestamps, {
      value: toWei(amount),
    })
    await tx.wait()
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

// ------------------- HELPERS -------------------
const structureAppartments = (appartments) =>
  appartments.map((appartment) => ({
    id: Number(appartment.id),
    name: appartment.name,
    owner: appartment.owner,
    description: appartment.description,
    location: appartment.location,
    price: fromWei(appartment.price),
    deleted: appartment.deleted,
    images: appartment.images.split(","),
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
