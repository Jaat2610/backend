const mongoose = require('mongoose');
const { Player, Match, Statistics } = require('../models');
require('dotenv').config();

async function seedStatistics() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/junior-soccer-tool', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);

    // First, make sure we have players
    let players = await Player.find({});
    
    if (players.length === 0) {
      console.log('No players found. Creating some sample players...');
      const samplePlayers = [
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
          injuryStatus: "Healthy",
          availability: true,
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
        },
        {
          name: "Casey Brown",
          jerseyNumber: 7,
          position: "Midfielder",
          preferredPositions: ["Midfielder"],
          injuryStatus: "Healthy",
          availability: true,
          dateOfBirth: new Date("2010-09-12")
        },
        {
          name: "Morgan Davis",
          jerseyNumber: 3,
          position: "Defender",
          preferredPositions: ["Defender"],
          injuryStatus: "Healthy",
          availability: true,
          dateOfBirth: new Date("2011-01-30")
        }
      ];
      
      players = await Player.insertMany(samplePlayers);
      console.log(`Created ${players.length} sample players`);
    }

    // Clear existing matches and statistics
    await Match.deleteMany({});
    await Statistics.deleteMany({});
    console.log('Cleared existing matches and statistics');

    // Create sample matches
    const matches = [];
    const statistics = [];
    
    // Create 5 sample matches over the past month
    for (let i = 0; i < 5; i++) {
      const matchDate = new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)); // One week apart
      
      const match = new Match({
        date: matchDate,
        type: i % 3 === 0 ? 'training' : 'match',
        opponent: i % 3 === 0 ? undefined : `Team ${String.fromCharCode(65 + i)}`,
        venue: i % 2 === 0 ? 'Home Ground' : 'Away Ground',
        status: 'completed',
        duration: 90,
        teamSheet: players.slice(0, Math.min(4 + i, players.length)).map(p => p._id),
        notes: `Sample match ${i + 1}`
      });
      
      await match.save();
      matches.push(match);
      
      // Create statistics for each player in this match
      const playersInMatch = players.slice(0, Math.min(4 + i, players.length));
      
      for (let j = 0; j < playersInMatch.length; j++) {
        const player = playersInMatch[j];
        const minutesPlayed = Math.floor(Math.random() * 90) + 10; // 10-90 minutes
        
        const stat = new Statistics({
          playerId: player._id,
          matchId: match._id,
          minutesPlayed: minutesPlayed,
          positionsPlayed: [player.position],
          goals: player.position === 'Forward' ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
          assists: Math.floor(Math.random() * 3),
          yellowCards: Math.random() > 0.8 ? 1 : 0, // 20% chance of yellow card
          redCards: Math.random() > 0.95 ? 1 : 0, // 5% chance of red card
          rating: Math.floor(Math.random() * 4) + 6, // Rating between 6-10
          playerOfMatch: j === 0 && Math.random() > 0.7, // 30% chance for first player
          substitutionsCount: Math.random() > 0.7 ? 1 : 0, // 30% chance of substitution
          injuries: []
        });
        
        await stat.save();
        statistics.push(stat);
      }
    }

    console.log(`✅ Successfully seeded:`);
    console.log(`   📊 ${matches.length} matches`);
    console.log(`   📈 ${statistics.length} statistics records`);
    console.log(`   👥 ${players.length} players`);
    
    // Show some sample data
    console.log('\n📋 Sample Statistics:');
    for (const player of players.slice(0, 3)) {
      const playerStats = await Statistics.find({ playerId: player._id });
      const totalGoals = playerStats.reduce((sum, s) => sum + s.goals, 0);
      const totalMinutes = playerStats.reduce((sum, s) => sum + s.minutesPlayed, 0);
      console.log(`   ${player.name}: ${playerStats.length} matches, ${totalGoals} goals, ${totalMinutes} minutes`);
    }

  } catch (error) {
    console.error('Error seeding statistics:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    console.log('🎉 Statistics seeding complete! You can now view data in the frontend.');
  }
}

// Run the seed function
seedStatistics().catch(console.error);
