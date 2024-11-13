const axios = require('axios');
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json());
app.use(cookieParser()); // Add cookie-parser middleware
app.use(express.static(__dirname)); // Serve HTML file

function sendMessage(output) {
  console.log(output);
}
const api = { sendMessage };

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/start-sharing', (req, res) => {
  const { shareUrl, timeInterval } = req.body;
  const fbstate = req.cookies.fbstate; // Get fbstate from cookies

  if (!fbstate || !shareUrl || !timeInterval) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  // Initial values
  let sharedCount = 0;
  const shareCount = 1000;
  const deleteAfter = 60 * 60; // in seconds
  let timer = null;

  async function sharePost() {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/me/feed?fbstate=${fbstate}`, // Use fbstate instead of access token
        {
          link: shareUrl,
          privacy: { value: 'SELF' },
          no_story: true,
        }
      );

      sharedCount++;
      const postId = response?.data?.id;

      api.sendMessage(`Post shared: ${sharedCount}`);
      api.sendMessage(`Post ID: ${postId || 'Unknown'}`);

      if (sharedCount === shareCount) {
        clearInterval(timer);
        api.sendMessage('Finished sharing posts.');

        if (postId) {
          setTimeout(() => {
            deletePost(postId);
          }, deleteAfter * 1000);
        }
      }
    } catch (error) {
      console.error('Failed to share post:', error.response?.data || error.message);
      console.error('Error details:', error.config); // Logs full request details
    }
  }

  async function deletePost(postId) {
    try {
      await axios.delete(`https://graph.facebook.com/${postId}?fbstate=${fbstate}`); // Use fbstate instead of access token
      api.sendMessage(`Post deleted: ${postId}`);
    } catch (error) {
      console.error('Failed to delete post:', error.response?.data || error.message);
      console.error('Delete error details:', error.config); // Logs full request details
    }
  }

  // Start sharing timer
  timer = setInterval(sharePost, timeInterval);

  // Stop loop after set number of shares
  setTimeout(() => {
    clearInterval(timer);
    api.sendMessage('Loop stopped.');
  }, shareCount * timeInterval);

  res.json({ message: 'Started sharing posts.' });
});

// Set the fbstate in a cookie (for demonstration purposes)
app.post('/set-fbstate', (req, res) => {
  const { fbstate } = req.body;
  if (!fbstate) {
    return res.status(400).json({ message: 'FB state is required.' });
  }
  res.cookie('fbstate', fbstate, { maxAge: 900000, httpOnly: true }); // Set cookie with 15 minutes expiration
  res.json({ message: 'FB state set in cookie.' });
});

app.listen(3000, () => api.sendMessage('App listening on port 3000!'));
