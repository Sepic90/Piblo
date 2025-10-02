import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Menu, X, Plus, Car, History, Settings, Download, Trash2, Edit2, Camera, Calendar, Gauge, Wrench, ChevronDown, ChevronUp, LogOut, Eye, Copy, RefreshCw, Loader2 } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBzq4vs7hJEqUhqQxj1AJJHhQk8sh4ZEh4",
  authDomain: "piblo-b3172.firebaseapp.com",
  projectId: "piblo-b3172",
  storageBucket: "piblo-b3172.firebasestorage.app",
  messagingSenderId: "975704080999",
  appId: "1:975704080999:web:db73db15db6a5afad70ac2",
  measurementId: "G-1K692JRFE7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const compressImage = async (file, maxWidth) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else if (height > maxWidth) {
          width = (width * maxWidth) / height;
          height = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <Car className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">Piblo</h1>
          <p className="text-gray-600 text-sm">Car Service Tracker</p>
        </div>
        
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-blue-600 hover:text-blue-700 text-sm"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PibloApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cars, setCars] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [isPublicView, setIsPublicView] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.uid : 'No user');
      setUser(user);
      if (user) {
        await loadUserData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const shareId = path.replace('/share/', '');
      setIsPublicView(true);
      loadPublicCar(shareId);
    }
  }, []);

  const loadUserData = async (userId) => {
    try {
      console.log('Loading data for user:', userId);
      
      // Load cars
      const carsQuery = query(collection(db, 'cars'), where('userId', '==', userId));
      const carsSnapshot = await getDocs(carsQuery);
      const carsData = carsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Loaded cars:', carsData.length);
      setCars(carsData);

      // Load services - using a simpler query first to avoid index issues
      const servicesQuery = query(collection(db, 'services'), where('userId', '==', userId));
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort manually to avoid needing a composite index
      servicesData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      
      console.log('Loaded services:', servicesData.length);
      setServices(servicesData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error details:', error.message);
      alert('Error loading data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const loadPublicCar = async (shareId) => {
    try {
      const carsQuery = query(collection(db, 'cars'), where('shareId', '==', shareId), where('sharingEnabled', '==', true));
      const carsSnapshot = await getDocs(carsQuery);
      
      if (!carsSnapshot.empty) {
        const carData = { id: carsSnapshot.docs[0].id, ...carsSnapshot.docs[0].data() };
        setCars([carData]);
        setSelectedCar(carData);

        const servicesQuery = query(collection(db, 'services'), where('carId', '==', carData.id));
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort manually
        servicesData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setServices(servicesData);
        setCurrentView('service-history');
      } else {
        alert('This share link is invalid or has been disabled.');
      }
    } catch (error) {
      console.error('Error loading public car:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading Piblo...</p>
        </div>
      </div>
    );
  }

  if (isPublicView) {
    return <PublicShareView car={selectedCar} services={services} />;
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="lg:hidden bg-blue-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-6 h-6" />
          <span className="font-bold text-lg">Piblo</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b shadow-lg">
          <Sidebar currentView={currentView} setCurrentView={(view) => { setCurrentView(view); setMobileMenuOpen(false); }} />
        </div>
      )}

      <div className="flex overflow-x-hidden">
        <div className="hidden lg:block w-64 bg-white h-screen sticky top-0 border-r shadow-sm flex-shrink-0">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-800">Piblo</span>
            </div>
          </div>
          <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        </div>

        <div className="flex-1 w-full overflow-x-hidden">
          <div className="p-3 sm:p-4 lg:p-6 max-w-full">
            {currentView === 'dashboard' && <DashboardView cars={cars} services={services} setCurrentView={setCurrentView} />}
            {currentView === 'add-service' && <AddServiceView cars={cars} services={services} setServices={setServices} user={user} />}
            {currentView === 'service-history' && <ServiceHistoryView cars={cars} services={services} selectedCar={selectedCar} setSelectedCar={setSelectedCar} />}
            {currentView === 'manage-cars' && <ManageCarsView cars={cars} setCars={setCars} user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ currentView, setCurrentView }) {
  return (
    <nav className="p-3">
      <button
        onClick={() => setCurrentView('dashboard')}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition ${
          currentView === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Car className="w-5 h-5" />
        <span>Dashboard</span>
      </button>
      <button
        onClick={() => setCurrentView('add-service')}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition ${
          currentView === 'add-service' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Plus className="w-5 h-5" />
        <span>Add Service</span>
      </button>
      <button
        onClick={() => setCurrentView('service-history')}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition ${
          currentView === 'service-history' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <History className="w-5 h-5" />
        <span>Service History</span>
      </button>
      <button
        onClick={() => setCurrentView('manage-cars')}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition ${
          currentView === 'manage-cars' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span>Manage Cars</span>
      </button>
      <button
        onClick={() => signOut(auth)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition mt-4"
      >
        <LogOut className="w-5 h-5" />
        <span>Sign Out</span>
      </button>
    </nav>
  );
}

function DashboardView({ cars, services, setCurrentView }) {
  const totalServices = services.length;
  const recentServices = services.slice(0, 5);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{cars.length}</p>
              <p className="text-sm text-gray-600">Cars</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Wrench className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalServices}</p>
              <p className="text-sm text-gray-600">Total Services</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{services.filter(s => s.oilService).length}</p>
              <p className="text-sm text-gray-600">Oil Changes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Services</h2>
          <button
            onClick={() => setCurrentView('service-history')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All
          </button>
        </div>

        {recentServices.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No services recorded yet</p>
        ) : (
          <div className="space-y-2">
            {recentServices.map(service => {
              const car = cars.find(c => c.id === service.carId);
              return (
                <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 truncate">{service.task}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {car ? `${car.make} ${car.model}` : 'Unknown Car'} • {new Date(service.date).toLocaleDateString()}
                    </p>
                  </div>
                  {service.oilService && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0">
                      Oil Change
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AddServiceView({ cars, services, setServices, user }) {
  const [formData, setFormData] = useState({
    carId: '',
    date: new Date().toISOString().split('T')[0],
    task: '',
    description: '',
    oilService: false,
    odometer: '',
    parts: [{ description: '', partNumber: '', quantity: '' }],
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const addPart = () => {
    setFormData({
      ...formData,
      parts: [...formData.parts, { description: '', partNumber: '', quantity: '' }]
    });
  };

  const removePart = (index) => {
    const newParts = formData.parts.filter((_, i) => i !== index);
    setFormData({ ...formData, parts: newParts });
  };

  const updatePart = (index, field, value) => {
    const newParts = [...formData.parts];
    newParts[index][field] = value;
    setFormData({ ...formData, parts: newParts });
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
  };

  const handleSubmit = async () => {
    if (!formData.carId) {
      alert('Please select a car');
      return;
    }

    setUploading(true);
    try {
      const photoURLs = [];
      const thumbnailURLs = [];

      if (photos.length > 0) {
        setUploadProgress(`Processing ${photos.length} photo(s)...`);
        
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          setUploadProgress(`Processing photo ${i + 1} of ${photos.length}...`);
          
          const fullImage = await compressImage(photo, 2000);
          const thumbnail = await compressImage(photo, 300);
          
          setUploadProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
          
          const timestamp = Date.now();
          const fullRef = ref(storage, `users/${user.uid}/services/${timestamp}-${photo.name}`);
          const thumbRef = ref(storage, `users/${user.uid}/services/${timestamp}-thumb-${photo.name}`);
          
          await uploadBytes(fullRef, fullImage);
          await uploadBytes(thumbRef, thumbnail);
          
          const fullURL = await getDownloadURL(fullRef);
          const thumbURL = await getDownloadURL(thumbRef);
          
          photoURLs.push(fullURL);
          thumbnailURLs.push(thumbURL);
        }
      }

      setUploadProgress('Saving service entry...');

      const serviceData = {
        ...formData,
        userId: user.uid,
        odometer: parseInt(formData.odometer) || 0,
        photoURLs,
        thumbnailURLs,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'services'), serviceData);
      const newService = { id: docRef.id, ...serviceData };
      setServices([newService, ...services]);

      setFormData({
        carId: '',
        date: new Date().toISOString().split('T')[0],
        task: '',
        description: '',
        oilService: false,
        odometer: '',
        parts: [{ description: '', partNumber: '', quantity: '' }],
      });
      setPhotos([]);
      
      alert('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Error adding service. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Add Service Entry</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-4 border space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Car *</label>
          <select
            value={formData.carId}
            onChange={(e) => setFormData({ ...formData, carId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            required
          >
            <option value="">Choose a car...</option>
            {cars.map(car => (
              <option key={car.id} value={car.id}>
                {car.make} {car.model} {car.variant} ({car.year})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task *</label>
          <input
            type="text"
            value={formData.task}
            onChange={(e) => setFormData({ ...formData, task: e.target.value })}
            placeholder="e.g., Annual Service, Brake Replacement"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Enter detailed notes about this service..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="oilService"
            checked={formData.oilService}
            onChange={(e) => setFormData({ ...formData, oilService: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="oilService" className="text-sm font-medium text-gray-700">
            Oil Service (oil was changed)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (km)</label>
          <input
            type="number"
            value={formData.odometer}
            onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
            placeholder="e.g., 45000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Parts / Consumables Used</label>
            <button
              type="button"
              onClick={addPart}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Part
            </button>
          </div>
          <div className="space-y-2">
            {formData.parts.map((part, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={part.description}
                  onChange={(e) => updatePart(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={part.partNumber}
                    onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                    placeholder="Part #"
                    className="flex-1 sm:w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={part.quantity}
                    onChange={(e) => updatePart(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.parts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {photos.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">{photos.length} photo(s) selected</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {uploading ? 'Processing...' : 'Add Service Entry'}
        </button>
      </div>

      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-800 font-semibold mb-2">Processing Service Entry</p>
            <p className="text-gray-600 text-sm">{uploadProgress}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceHistoryView({ cars, services, selectedCar, setSelectedCar }) {
  const [expandedService, setExpandedService] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const filteredServices = selectedCar 
    ? services.filter(s => s.carId === selectedCar.id)
    : [];

  const handleExport = async (service) => {
    alert('Export functionality will download a ZIP file with service data and photos.');
  };

  if (!selectedCar) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Service History</h1>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <p className="text-gray-600 mb-3">Select a car to view its service history:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cars.map(car => (
              <button
                key={car.id}
                onClick={() => setSelectedCar(car)}
                className="text-left p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <p className="font-semibold text-gray-800">{car.make} {car.model}</p>
                <p className="text-sm text-gray-600">{car.variant} • {car.year}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <button
          onClick={() => setSelectedCar(null)}
          className="text-blue-600 hover:text-blue-700 mb-3 flex items-center gap-2 text-sm"
        >
          ← Back to car selection
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {selectedCar.make} {selectedCar.model} - Service History
        </h1>
        <p className="text-gray-600 mt-1 text-sm">{filteredServices.length} service entries</p>
      </div>

      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 border text-center">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No service entries for this car yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredServices.map(service => (
            <div key={service.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-lg truncate">{service.task}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {new Date(service.date).toLocaleDateString()}
                      </span>
                      {service.odometer > 0 && (
                        <span className="flex items-center gap-1">
                          <Gauge className="w-4 h-4 flex-shrink-0" />
                          {service.odometer.toLocaleString()} km
                        </span>
                      )}
                      {service.photoURLs && service.photoURLs.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera className="w-4 h-4 flex-shrink-0" />
                          {service.photoURLs.length} photo(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExport(service); }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Export this service"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {expandedService === service.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </div>
              </div>

              {expandedService === service.id && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  {service.description && (
                    <div className="mt-3">
                      <h4 className="font-semibold text-gray-800 mb-1 text-sm">Description / Notes</h4>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{service.description}</p>
                    </div>
                  )}

                  {service.parts && service.parts.some(p => p.description) && (
                    <div className="mt-3">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Parts / Consumables</h4>
                      <div className="space-y-2">
                        {service.parts.filter(p => p.description).map((part, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border">
                            <p className="font-medium text-gray-800 text-sm">{part.description}</p>
                            {part.partNumber && (
                              <p className="text-xs text-gray-600 mt-0.5">PN: {part.partNumber}</p>
                            )}
                            {part.quantity && (
                              <p className="text-xs text-gray-600">Qty: {part.quantity}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {service.thumbnailURLs && service.thumbnailURLs.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Photos</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {service.thumbnailURLs.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`Service photo ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition"
                              onClick={() => setLightboxImage(service.photoURLs[idx])}
                            />
                            <a
                              href={service.photoURLs[idx]}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-1 right-1 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition"
                              title="Download"
                            >
                              <Download className="w-3 h-3 text-gray-700" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="Full size" className="max-w-full max-h-full object-contain" />
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}

function ManageCarsView({ cars, setCars, user }) {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    variant: '',
    year: '',
  });
  const [editingCar, setEditingCar] = useState(null);

  const handleSubmit = async () => {
    if (!formData.make || !formData.model || !formData.year) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingCar) {
        await updateDoc(doc(db, 'cars', editingCar.id), formData);
        setCars(cars.map(c => c.id === editingCar.id ? { ...c, ...formData } : c));
        setEditingCar(null);
      } else {
        const carData = { ...formData, userId: user.uid, sharingEnabled: false, shareId: Math.random().toString(36).substring(7) };
        const docRef = await addDoc(collection(db, 'cars'), carData);
        setCars([...cars, { id: docRef.id, ...carData }]);
      }

      setFormData({ make: '', model: '', variant: '', year: '' });
      alert(editingCar ? 'Car updated!' : 'Car added!');
    } catch (error) {
      console.error('Error saving car:', error);
      alert('Error saving car. Please try again.');
    }
  };

  const handleDelete = async (carId) => {
    if (window.confirm('Are you sure you want to delete this car?')) {
      try {
        await deleteDoc(doc(db, 'cars', carId));
        setCars(cars.filter(c => c.id !== carId));
      } catch (error) {
        console.error('Error deleting car:', error);
        alert('Error deleting car. Please try again.');
      }
    }
  };

  const handleEdit = (car) => {
    setEditingCar(car);
    setFormData({
      make: car.make,
      model: car.model,
      variant: car.variant || '',
      year: car.year,
    });
  };

  const toggleSharing = async (car) => {
    try {
      const newSharingState = !car.sharingEnabled;
      await updateDoc(doc(db, 'cars', car.id), { sharingEnabled: newSharingState });
      setCars(cars.map(c => c.id === car.id ? { ...c, sharingEnabled: newSharingState } : c));
    } catch (error) {
      console.error('Error toggling sharing:', error);
      alert('Error updating sharing settings.');
    }
  };

  const copyShareLink = (shareId) => {
    const link = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(link);
    alert('Share link copied to clipboard!');
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Manage Cars</h1>

      <div className="bg-white rounded-lg shadow-sm p-4 border mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          {editingCar ? 'Edit Car' : 'Add New Car'}
        </h2>
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Make *"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="text"
              placeholder="Model *"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Variant"
              value={formData.variant}
              onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="text"
              placeholder="Year *"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
            >
              {editingCar ? 'Update Car' : 'Add Car'}
            </button>
            {editingCar && (
              <button
                onClick={() => {
                  setEditingCar(null);
                  setFormData({ make: '', model: '', variant: '', year: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {cars.map(car => (
          <div key={car.id} className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-800 truncate">
                  {car.make} {car.model} {car.variant}
                </h3>
                <p className="text-sm text-gray-600">{car.year}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(car)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(car.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Public Sharing</span>
                <button
                  onClick={() => toggleSharing(car)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    car.sharingEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {car.sharingEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {car.sharingEnabled && (
                <button
                  onClick={() => copyShareLink(car.shareId)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy Share Link
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicShareView({ car, services }) {
  const [lightboxImage, setLightboxImage] = useState(null);

  if (!car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Car not found or sharing has been disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 border mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Car className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-800 truncate">
                {car.make} {car.model} {car.variant}
              </h1>
              <p className="text-sm text-gray-600">{car.year}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {services.length} service {services.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        <div className="space-y-3">
          {services.map(service => (
            <div key={service.id} className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800 text-lg mb-2 truncate">{service.task}</h3>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{new Date(service.date).toLocaleDateString()}</span>
                </span>
                {service.odometer > 0 && (
                  <span className="flex items-center gap-1">
                    <Gauge className="w-4 h-4 flex-shrink-0" />
                    {service.odometer.toLocaleString()} km
                  </span>
                )}
              </div>

              {service.description && (
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-800 mb-1 text-sm">Description</h4>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{service.description}</p>
                </div>
              )}

              {service.parts && service.parts.some(p => p.description) && (
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">Parts / Consumables</h4>
                  <div className="space-y-2">
                    {service.parts.filter(p => p.description).map((part, idx) => (
                      <div key={idx} className="bg-gray-50 p-2 rounded-lg border">
                        <p className="font-medium text-gray-800 text-sm break-words">{part.description}</p>
                        {part.partNumber && (
                          <p className="text-xs text-gray-600 mt-0.5 break-words">PN: {part.partNumber}</p>
                        )}
                        {part.quantity && (
                          <p className="text-xs text-gray-600">Qty: {part.quantity}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {service.thumbnailURLs && service.thumbnailURLs.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2 text-sm">Photos</h5>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {service.thumbnailURLs.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Service photo ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition"
                        onClick={() => setLightboxImage(service.photoURLs[idx])}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>Powered by Piblo • Car Service Tracker</p>
        </div>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="Full size" className="max-w-full max-h-full object-contain" />
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}