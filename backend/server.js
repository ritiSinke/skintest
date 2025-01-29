import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import cors from 'cors';

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Save file in memory

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// POST endpoint for analyzing the image
app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const form = new FormData();

    // Append API credentials
    const API_KEY = 'xBNjK9aX1ZN8Tb15g6PlVIG3Q-Zp9BsX';
    const API_SECRET = 'triz080BGPjlip0DpSVBCVxpmz3P6nlh';
    form.append('api_key', API_KEY);
    form.append('api_secret', API_SECRET);

    // Append the uploaded image
    if (req.file) {
      form.append('image_file', req.file.buffer, 'image.jpg');
    } else {
      console.error("No image uploaded.");
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Send the image to Face++ API
    const response = await axios.post(
      'https://api-us.faceplusplus.com/facepp/v1/skinanalyze',
      form,
      { headers: form.getHeaders() }
    );

    // Log the response from Face++ API
    console.log("Face++ Response:", response.data);

    res.json(response.data);
  } catch (error) {
    console.error("Error analyzing image:", error?.response?.data || error.message);

    if (error.response) {
      // Log detailed error from Face++ API
      return res.status(error.response.status).json({
        error: 'Failed to analyze image.',
        details: error.response.data,
      });
    } else if (error.request) {
      // No response received
      return res.status(500).json({ error: 'No response received from Face++ API.' });
    } else {
      // Other errors
      return res.status(500).json({ error: 'Error in processing request.' });
    }
  }
});


// Start the server
app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});
