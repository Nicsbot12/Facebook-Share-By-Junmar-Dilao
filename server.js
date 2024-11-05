const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function sendMessage(output) {
  console.log(output);
}
const api = {
  sendMessage: sendMessage
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => api.sendMessage('App listening on port 3000!'));

let timer = null;
let sharedCount = 0;

async function sharePost(accessToken, shareUrl, shareCount, deleteAfter) {
  if (!accessToken) {
    console.error('Error: Access token is missing.');
    return;
  }

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
          deletePost(postId, accessToken);
        }, deleteAfter * 1000);
      }
    }
  } catch (error) {
    console.error('Failed to share post:', error.response?.data || error.message);
  }
}

async function deletePost(postId, accessToken) {
  try {
    await axios.delete(`https://graph.facebook.com/${postId}?access_token=${accessToken}`);
    api.sendMessage(`Post deleted: ${postId}`);
  } catch (error) {
    console.error('Failed to delete post:', error.response?.data || error.message);
  }
}

// Handle form submission
app.post('/start-sharing', (req, res) => {
  const { accessToken, shareUrl, shareCount, timeInterval, deleteAfter } = req.body;

  sharedCount = 0; // Reset shared count
  timer = setInterval(() => sharePost(accessToken, shareUrl, shareCount, deleteAfter), timeInterval);

  setTimeout(() => {
    clearInterval(timer);
    api.sendMessage('Loop stopped.');
  }, shareCount * timeInterval);

  res.json({ message: 'Sharing started!' });
});

app.post('/stop-sharing', (req, res) => {
  clearInterval(timer);
  api.sendMessage('Loop stopped.');
  res.json({ message: 'Sharing stopped!' });
});
