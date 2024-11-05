const axios = require('axios');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Serve HTML file

function sendMessage(output) {
  console.log(output);
}
const api = { sendMessage };

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/start-sharing', (req, res) => {
  const { accessToken, shareUrl, timeInterval } = req.body;

  if (!accessToken || !shareUrl || !timeInterval) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  // Set initial values
  let sharedCount = 0;
  const shareCount = 185;
  const deleteAfter = 60 * 60;
  let timer = null;

  async function sharePost() {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/me/feed?access_token=${accessToken}`,
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
    }
  }

  async function deletePost(postId) {
    try {
      await axios.delete(`https://graph.facebook.com/${postId}?access_token=${accessToken}`);
      api.sendMessage(`Post deleted: ${postId}`);
    } catch (error) {
      console.error('Failed to delete post:', error.response?.data || error.message);
    }
  }

  // Start the sharing timer based on user input
  timer = setInterval(sharePost, timeInterval);

  // Stop the loop after the set number of shares
  setTimeout(() => {
    clearInterval(timer);
    api.sendMessage('Loop stopped.');
  }, shareCount * timeInterval);

  res.json({ message: 'Started sharing posts.' });
});

app.listen(3000, () => api.sendMessage('App listening on port 3000!'));
    
