const mongoose = require('mongoose');
const { Player } = require('../models');
require('dotenv').config();

// Dummy player data
const dummyPlayers = [
  {
    name: "Alex Johnson",
    jerseyNumber: 10,
    position: "Forward",
    preferredPositions: ["Forward", "Midfielder"],
    injuryStatus: "Healthy",
    availability: true,
    dateOfBirth: new Date("2010-03-15")
  },
  {
    name: "Sam Wilson",
    jerseyNumber: 5,
    position: "Defender",
    preferredPositions: ["Defender"],
    injuryStatus: "Minor Injury",
    availability: false, // Sam has a minor injury, so he's unavailable
    dateOfBirth: new Date("2011-07-22")
  },
  {
    name: "Jordan Smith",
    jerseyNumber: 1,
    position: "Goalkeeper",
    preferredPositions: ["Goalkeeper"],
    injuryStatus: "Healthy",
    availability: true,
    dateOfBirth: new Date("2009-11-08")
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/junior-soccer-tool', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);

    // Clear existing players
    await Player.deleteMany({});
    console.log('Cleared existing players');

    // Insert dummy players
    const players = await Player.insertMany(dummyPlayers);
    console.log(`Successfully seeded ${players.length} players:`);

    players.forEach(player => {
      console.log(`- ${player.name} (#${player.jerseyNumber}) - ${player.position}`);
    });

  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedDatabase().catch(console.error);
