

# House Rental Plarform Build On ONINO Blockchain

A decentralized apartment rental application built on ONINO (ONINI Testnet compatible). RentalDapp allows apartment owners to list properties, while tenants can book, pay securely and leave reviews  all powered by smart contracts and decentralized technologies.

## Features
Apartment Management

Create, update, and delete apartment listings

Upload apartment details: name, description, location, images, rooms, and price

Booking System

Book apartments by selecting dates

Pay rent directly via smart contract

Automatic security fee handling

Check-in & refund functionalities

Review System

Tenants can leave verified reviews after bookings

Display reviews with timestamps and user identity

Blockchain Integration

Powered by ONINO Testnet smart contracts

Secure payments with ethers.js

Wallet connection via RainbowKit + Wagmi

UI/UX

Built with Next.js + TailwindCSS

Smooth interactions with React, Redux Toolkits.

Responsive design for desktop & mobile

## Tech Stack

Frontend: Next.js, React, TailwindCSS, Redux Toolkit

Smart Contracts: Solidity, Hardhat, OpenZeppelin

Blockchain Tools: Ethers.js, Wagmi, RainbowKit, Viem

Database/Storage: Lokijs (local in-memory)

Utilities: Moment.js, React-Icons, React-Datepicker

## Installation

## Step 1. Clone the project

git clone git clonehttps://github.com/Dev-Oud/RentalDapp<PROJECT NAME>
cd RentalDapp



## Step 2. Install dependencies

```sh
$ cd RentalDapp
$ yarn install # or npm install
```

## Step 3. Start Hardhat Node

Open the terminal and run the command below.

```sh
$ yarn hardhat node
```

## Step 4. Run the Front End Application

`$ yarn dev`
Visit this URL in your browser: http://localhost:3000


## Deployment


Build for production:
```sh
$ npm run build
$ npm start

```
 Smart contracts are deployed using Hardhat:
```sh
$ npx hardhat run scripts/deploy.js --network testnet

```
## Testing
Run Hardhat tests:
```sh
$ npx hardhat test
```
## Contribution

Contributions, issues, and feature requests are welcome!
Feel free to fork the repo and submit a pull request

## License
This project is licensed under the MIT License.

## Author

Masud Umar Muhammad

GitHub: https://github.com/Dev-Oud

Twitter: https://x.com/Masud_eth_