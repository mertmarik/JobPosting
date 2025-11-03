const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'jobs.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Static dosyalar için

// JSON dosyasından verileri oku
async function readJobsData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('JSON dosyası okunurken hata:', error.message);
        return []; // Dosya yoksa boş array döndür
    }
}

// JSON dosyasına verileri yaz
async function writeJobsData(jobs) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(jobs, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('JSON dosyasına yazılırken hata:', error);
        return false;
    }
}

// Ana sayfa - frontend'i serve et
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// Tüm işleri getir
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await readJobsData();
        res.json(jobs);
    } catch (error) {
        console.error('İşler getirilirken hata:', error);
        res.status(500).json({ error: 'İşler getirilemedi' });
    }
});

// Yeni iş ekle
app.post('/api/jobs', async (req, res) => {
    try {
        const jobs = await readJobsData();
        const newJob = {
            id: Date.now(), // Basit ID oluşturma
            ...req.body,
            dateAdded: new Date().toISOString().split('T')[0]
        };
        
        jobs.unshift(newJob); // En başa ekle
        
        const success = await writeJobsData(jobs);
        if (success) {
            res.status(201).json(newJob);
        } else {
            res.status(500).json({ error: 'İş kaydedilemedi' });
        }
    } catch (error) {
        console.error('İş eklenirken hata:', error);
        res.status(500).json({ error: 'İş eklenirken hata oluştu' });
    }
});

// İş sil
app.delete('/api/jobs/:id', async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        const jobs = await readJobsData();
        const filteredJobs = jobs.filter(job => job.id !== jobId);
        
        if (filteredJobs.length === jobs.length) {
            return res.status(404).json({ error: 'İş bulunamadı' });
        }
        
        const success = await writeJobsData(filteredJobs);
        if (success) {
            res.json({ message: 'İş başarıyla silindi' });
        } else {
            res.status(500).json({ error: 'İş silinemedi' });
        }
    } catch (error) {
        console.error('İş silinirken hata:', error);
        res.status(500).json({ error: 'İş silinirken hata oluştu' });
    }
});

// İş güncelle
app.put('/api/jobs/:id', async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        const jobs = await readJobsData();
        const jobIndex = jobs.findIndex(job => job.id === jobId);
        
        if (jobIndex === -1) {
            return res.status(404).json({ error: 'İş bulunamadı' });
        }
        
        jobs[jobIndex] = { ...jobs[jobIndex], ...req.body };
        
        const success = await writeJobsData(jobs);
        if (success) {
            res.json(jobs[jobIndex]);
        } else {
            res.status(500).json({ error: 'İş güncellenemedi' });
        }
    } catch (error) {
        console.error('İş güncellenirken hata:', error);
        res.status(500).json({ error: 'İş güncellenirken hata oluştu' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Sunucu hatası:', error);
    res.status(500).json({ error: 'İç sunucu hatası' });
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api/jobs`);
});

module.exports = app;