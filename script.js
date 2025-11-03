// Global değişkenler
let jobs = [];
let filteredJobs = [];

// API base URL - production'da değiştirilecek
const API_BASE_URL = window.location.origin; // Dinamik URL

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    loadJobs();
    initializeEventListeners();
});

// Event listener'ları başlat
function initializeEventListeners() {
    // Form toggle
    document.getElementById('toggleForm').addEventListener('click', toggleForm);
    document.getElementById('cancelForm').addEventListener('click', hideForm);
    
    // Form submit
    document.getElementById('jobForm').addEventListener('submit', handleFormSubmit);
    
    // Arama ve filtreler
    document.getElementById('searchInput').addEventListener('input', filterJobs);
    document.getElementById('technologyFilter').addEventListener('change', filterJobs);
    document.getElementById('paymentTypeFilter').addEventListener('change', filterJobs);
}

// İş ilanlarını API'den yükle
async function loadJobs() {
    try {
        showNotification('Veriler yükleniyor...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/jobs`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        jobs = await response.json();
        filteredJobs = [...jobs];
        populateTechnologyFilter();
        displayJobs();
        
        showNotification(`${jobs.length} iş ilanı başarıyla yüklendi`, 'success');
        
    } catch (error) {
        console.error('İş ilanları yüklenirken hata oluştu:', error);
        
        // Fallback: localStorage'dan yüklemeyi dene
        const savedJobs = localStorage.getItem('jobs');
        if (savedJobs) {
            jobs = JSON.parse(savedJobs);
            filteredJobs = [...jobs];
            populateTechnologyFilter();
            displayJobs();
            showNotification('Veriler yerel depolamadan yüklendi (offline mod)', 'warning');
        } else {
            jobs = [];
            filteredJobs = [];
            showNoJobsMessage();
            showNotification('Veriler yüklenemedi. Sunucu bağlantısını kontrol edin.', 'error');
        }
    }
}

// Teknoloji filtresini doldur
function populateTechnologyFilter() {
    const technologyFilter = document.getElementById('technologyFilter');
    const technologies = [...new Set(jobs.map(job => job.technology.split(', ').map(t => t.trim())).flat())];
    
    // Mevcut seçenekleri temizle (ilk seçenek hariç)
    technologyFilter.innerHTML = '<option value="">Tüm Teknolojiler</option>';
    
    technologies.sort().forEach(tech => {
        const option = document.createElement('option');
        option.value = tech;
        option.textContent = tech;
        technologyFilter.appendChild(option);
    });
}

// İş ilanlarını görüntüle
function displayJobs() {
    const container = document.getElementById('jobsContainer');
    const noJobsMessage = document.getElementById('noJobsMessage');
    
    if (filteredJobs.length === 0) {
        showNoJobsMessage();
        return;
    }
    
    noJobsMessage.classList.add('hidden');
    container.innerHTML = '';
    
    filteredJobs.forEach(job => {
        const jobCard = createJobCard(job);
        container.appendChild(jobCard);
    });
}

// İş kartı oluştur
function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    
    // Ödeme tipi için renk belirleme
    const paymentTypeClass = getPaymentTypeClass(job.paymentType);
    
    card.innerHTML = `
        <div class="job-header">
            <h3 class="job-title">${job.title}</h3>
            <span class="payment-type ${paymentTypeClass}">${job.paymentType}</span>
        </div>
        
        <div class="company-info">
            <i class="fas fa-building"></i>
            <span>${job.company}</span>
        </div>
        
        <div class="job-details">
            <div class="detail-item">
                <i class="fas fa-code"></i>
                <span><strong>Teknoloji:</strong> ${job.technology}</span>
            </div>
            
            <div class="detail-item">
                <i class="fas fa-money-bill-wave"></i>
                <span><strong>Ücret:</strong> ${job.salary}</span>
            </div>
            
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span><strong>Süre:</strong> ${job.duration}</span>
            </div>
        </div>
        
        <div class="requirements">
            <h4><i class="fas fa-list-check"></i> Gereksinimler:</h4>
            <p>${job.requirements}</p>
        </div>
        
        <div class="job-actions">
            <a href="${job.jobLink}" target="_blank" class="btn btn-primary">
                <i class="fas fa-external-link-alt"></i> İlana Git
            </a>
            <button class="btn btn-danger" onclick="deleteJob(${job.id})">
                <i class="fas fa-trash"></i> Sil
            </button>
        </div>
        
        <div class="job-date">
            <i class="fas fa-calendar"></i>
            ${formatDate(job.dateAdded)}
        </div>
    `;
    
    return card;
}

// Ödeme tipi için CSS sınıfı
function getPaymentTypeClass(paymentType) {
    switch(paymentType) {
        case 'Saatlik': return 'hourly';
        case 'Fixed Price': return 'fixed';
        case 'Aylık': return 'monthly';
        default: return 'default';
    }
}

// Tarih formatlama
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Form göster/gizle
function toggleForm() {
    const form = document.getElementById('jobForm');
    form.classList.toggle('hidden');
    
    if (!form.classList.contains('hidden')) {
        document.getElementById('jobTitle').focus();
    }
}

function hideForm() {
    document.getElementById('jobForm').classList.add('hidden');
    document.getElementById('jobForm').reset();
}

// Form submit işlemi
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newJob = {
        id: Date.now(), // Basit ID oluşturma
        title: document.getElementById('jobTitle').value,
        company: document.getElementById('company').value,
        requirements: document.getElementById('requirements').value,
        technology: document.getElementById('technology').value,
        salary: document.getElementById('salary').value,
        paymentType: document.getElementById('paymentType').value,
        duration: document.getElementById('duration').value,
        jobLink: document.getElementById('jobLink').value,
        dateAdded: new Date().toISOString().split('T')[0]
    };
    
    addJob(newJob);
}

// Yeni iş ekle - API kullanarak
async function addJob(job) {
    try {
        showNotification('İş ilanı kaydediliyor...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(job)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const savedJob = await response.json();
        
        // Local state'i güncelle
        jobs.unshift(savedJob);
        filteredJobs = [...jobs];
        
        // LocalStorage'a da kaydet (offline backup için)
        localStorage.setItem('jobs', JSON.stringify(jobs));
        
        populateTechnologyFilter();
        displayJobs();
        hideForm();
        
        showNotification('İş ilanı başarıyla eklendi!', 'success');
        
    } catch (error) {
        console.error('İş eklenirken hata:', error);
        showNotification('İş ilanı eklenirken hata oluştu!', 'error');
    }
}

// İş sil - API kullanarak
async function deleteJob(jobId) {
    if (!confirm('Bu iş ilanını silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        showNotification('İş ilanı siliniyor...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Local state'i güncelle
        jobs = jobs.filter(job => job.id !== jobId);
        filteredJobs = filteredJobs.filter(job => job.id !== jobId);
        
        // LocalStorage'a da kaydet (offline backup için)
        localStorage.setItem('jobs', JSON.stringify(jobs));
        
        populateTechnologyFilter();
        displayJobs();
        
        showNotification('İş ilanı başarıyla silindi!', 'success');
        
    } catch (error) {
        console.error('İş silinirken hata:', error);
        showNotification('İş ilanı silinirken hata oluştu!', 'error');
    }
}

// İş ilanlarını filtrele
function filterJobs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const technologyFilter = document.getElementById('technologyFilter').value;
    const paymentTypeFilter = document.getElementById('paymentTypeFilter').value;
    
    filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm) ||
                            job.company.toLowerCase().includes(searchTerm) ||
                            job.requirements.toLowerCase().includes(searchTerm) ||
                            job.technology.toLowerCase().includes(searchTerm);
        
        const matchesTechnology = !technologyFilter || 
                                job.technology.toLowerCase().includes(technologyFilter.toLowerCase());
        
        const matchesPaymentType = !paymentTypeFilter || job.paymentType === paymentTypeFilter;
        
        return matchesSearch && matchesTechnology && matchesPaymentType;
    });
    
    displayJobs();
}

// Boş mesaj göster
function showNoJobsMessage() {
    document.getElementById('jobsContainer').innerHTML = '';
    document.getElementById('noJobsMessage').classList.remove('hidden');
}

// Bildirim göster
function showNotification(message, type = 'info') {
    // Mevcut bildirimleri kaldır
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // 5 saniye sonra otomatik kaldır
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// LocalStorage'ı temizle ve sunucudan yeniden yükle
async function clearStorage() {
    if (!confirm('Tüm yerel veriler temizlenecek ve sunucudan yeniden yüklenecek. Emin misiniz?')) {
        return;
    }
    
    try {
        localStorage.removeItem('jobs');
        showNotification('Yerel veriler temizlendi, sunucudan yeniden yükleniyor...', 'info');
        await loadJobs();
    } catch (error) {
        console.error('Veriler temizlenirken hata:', error);
        showNotification('Veriler temizlenirken hata oluştu!', 'error');
    }
}

// Sunucu durumunu kontrol et
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (response.ok) {
            const data = await response.json();
            showNotification('Sunucu bağlantısı aktif ✅', 'success');
            return true;
        }
        return false;
    } catch (error) {
        showNotification('Sunucu bağlantısı yok ❌', 'error');
        return false;
    }
}