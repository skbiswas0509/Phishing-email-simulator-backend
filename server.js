require('dotenv').config();
const express = require('express');
const cors = require('cors');

const campaignRoutes = require('./routes/campaigns');
const trackRoutes = require('./routes/track');
const sendRoutes = require('./routes/send');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/campaigns', campaignRoutes);
app.use('/track', trackRoutes);
app.use('/api/send', sendRoutes)

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`PhishGuard backend running on port ${PORT}`));