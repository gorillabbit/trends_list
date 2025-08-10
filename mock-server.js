// Simple mock API server for development
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Mock data
let presets = [
  {
    id: 'react-vs-vue-vs-angular',
    title: 'React vs Vue vs Angular',
    packages: ['react', 'vue', 'angular'],
    npmtrends_url: 'https://npmtrends.com/react-vs-vue-vs-angular',
    owner_id: 'github:123',
    likes_count: 42,
    created_at: '2024-01-01T00:00:00.000Z',
    owner_name: 'Developer',
    owner_avatar: 'https://github.com/identicons/developer.png',
    liked: false,
  },
  {
    id: 'express-vs-fastify-vs-koa',
    title: 'Express vs Fastify vs Koa',
    packages: ['express', 'fastify', 'koa'],
    npmtrends_url: 'https://npmtrends.com/express-vs-fastify-vs-koa',
    owner_id: 'github:456',
    likes_count: 28,
    created_at: '2024-01-02T00:00:00.000Z',
    owner_name: 'Backend Dev',
    owner_avatar: 'https://github.com/identicons/backenddev.png',
    liked: true,
  },
];

let user = null;

// Auth endpoints
app.get('/auth/login', (req, res) => {
  // Mock login - just redirect back with success
  setTimeout(() => {
    user = {
      id: 'github:mock-user',
      name: 'Mock User',
      avatar_url: 'https://github.com/identicons/mockuser.png',
      created_at: '2024-01-01T00:00:00.000Z',
      stats: {
        presets_count: 5,
        total_likes: 123,
      },
    };
  }, 1000);
  res.redirect('http://localhost:3000?login=success');
});

app.get('/auth/logout', (req, res) => {
  user = null;
  res.redirect('http://localhost:3000?logout=success');
});

// API endpoints
app.get('/api/me', (req, res) => {
  res.json({
    authenticated: !!user,
    user: user,
  });
});

app.get('/api/presets', (req, res) => {
  const sort = req.query.sort || 'likes';
  const page = parseInt(req.query.page || '1');
  
  let sortedPresets = [...presets];
  if (sort === 'likes') {
    sortedPresets.sort((a, b) => b.likes_count - a.likes_count);
  } else {
    sortedPresets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  res.json({
    presets: sortedPresets,
    page: page,
    hasMore: false,
  });
});

app.post('/api/presets', (req, res) => {
  if (!user) {
    return res.status(401).json({ error: 'ログインが必要です' });
  }

  const { title, packages } = req.body;
  if (!title || !packages || packages.length < 2) {
    return res.status(400).json({ error: 'タイトルと2つ以上のパッケージが必要です' });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  const npmtrendsUrl = `https://npmtrends.com/${packages.join('-vs-')}`;

  const newPreset = {
    id: slug,
    title,
    packages,
    npmtrends_url: npmtrendsUrl,
    owner_id: user.id,
    likes_count: 0,
    created_at: new Date().toISOString(),
    owner_name: user.name,
    owner_avatar: user.avatar_url,
    liked: false,
  };

  presets.unshift(newPreset);
  res.json(newPreset);
});

app.post('/api/presets/:slug/like', (req, res) => {
  if (!user) {
    return res.status(401).json({ error: 'ログインが必要です' });
  }

  const { slug } = req.params;
  const preset = presets.find(p => p.id === slug);
  
  if (!preset) {
    return res.status(404).json({ error: 'プリセットが見つかりません' });
  }

  preset.liked = !preset.liked;
  preset.likes_count += preset.liked ? 1 : -1;

  res.json({
    liked: preset.liked,
    likes_count: preset.likes_count,
  });
});

app.post('/api/verify-turnstile', (req, res) => {
  // Mock Turnstile - always succeed
  res.json({ success: true, message: '検証に成功しました' });
});

const PORT = 8788;
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});