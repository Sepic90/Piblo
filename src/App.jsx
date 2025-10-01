import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Menu, X, Plus, Car, History, Settings, Download, Trash2, Edit2, Camera, Calendar, Gauge, Wrench, ChevronDown, ChevronUp, LogOut, Eye, Copy, RefreshCw } from 'lucide-react';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBzq4vs7hJEqUhqQxj1AJJHhQk8sh4ZEh4",
  authDomain: "piblo-b3172.firebaseapp.com",
  projectId: "piblo-b3172",
  storageBucket: "piblo-b3172.firebasestorage.app",
  messagingSenderId: "975704080999",
  appId: "1:975704080999:web:db73db15db6a5afad70ac2",
  measurementId: "G-1K692JRFE7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Image compression utility
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

// Main App Component
export default function PibloApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cars, setCars] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [isPublicView, setIsPublicView] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        loadUserData(user.uid);
      }
    });
    return unsubscribe;
  }, []);

  // Check for public share link
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
      const carsQuery = query(collection(db, 'cars'), where('userId', '==', userId));
      const carsSnapshot = await getDocs(carsQuery);
      const carsData = carsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCars(carsData);

      const servicesQuery = query(collection(db, 'services'), where('userId', '==', userId), orderBy('date', 'desc'));
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(servicesData);
    } catch (error) {
      console.error('Error loading data:', error);
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

        const servicesQuery = query(collection(db, 'services'), where('carId', '==', carData.id), orderBy('date', 'desc'));
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(servicesData);
        setCurrentView('service-history');
      } else {
        alert('This share link is invalid or has been disabled.');
      }
    } catch (error) {
      console.error('Error loading public car:', error);
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
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden bg-blue-600 text-white p-4 flex items-center justify-between">
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
          <NavigationMenu 
            currentView={currentView} 
            setCurrentView={(view) => {
              setCurrentView(view);
              setMobileMenuOpen(false);
            }}
          />
        </div>
      )}

      <div className="flex">
        <div className="hidden lg:block w-64 bg-white h-screen sticky top-0 border-r shadow-sm">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-800">Piblo</span>
            </div>
          </div>
          <NavigationMenu currentView={currentView} setCurrentView={setCurrentView} />
        </div>

        <div className="flex-1 p-4 lg:p-8">
          {currentView === 'dashboard' && <Dashboard cars={cars} services={services} setCurrentView={setCurrentView} />}
          {currentView === 'add-service' && <AddServiceView cars={cars} services={services} setServices={setServices} user={user} />}
          {currentView === 'service-history' && <ServiceHistoryView cars={cars} services={services} selectedCar={selectedCar} setSelectedCar={setSelectedCar} />}
          {currentView === 'manage-cars' && <ManageCarsView cars={cars} setCars={setCars} user={user} />}
        </div>
      </div>
    </div>
  );
}

// Navigation Menu Component
function NavigationMenu({ currentView, setCurrentView }) {
  return (
    <nav className="p-4">
      <button
        onClick={() => setCurrentView('dashboard')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
          currentView === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Car className="w-5 h-5" />
        <span>Dashboard</span>
      </button>
      <button
        onClick={() => setCurrentView('add-service')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
          currentView === 'add-service' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Plus className="w-5 h-5" />
        <span>Add Service</span>
      </button>
      <button
        onClick={() => setCurrentView('service-history')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
          currentView === 'service-history' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <History className="w-5 h-5" />
        <span>Service History</span>
      </button>
      <button
        onClick={() => setCurrentView('manage-cars')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
          currentView === 'manage-cars' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span>Manage Cars</span>
      </button>
      
      <div className="mt-8 pt-4 border-t">
        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

// Auth View Component
function AuthView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Car className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Piblo</h1>
          <p className="text-gray-600 mt-2">Track your car's service history</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:underline text-sm"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ cars, services, setCurrentView }) {
  const totalServices = services.length;
  const recentServices = services.slice(0, 5);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Cars</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{cars.length}</p>
            </div>
            <Car className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Services</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{totalServices}</p>
            </div>
            <Wrench className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Quick Actions</p>
              <button
                onClick={() => setCurrentView('add-service')}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
              >
                Add Service
              </button>
            </div>
            <Plus className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Services</h2>
        {recentServices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No services recorded yet</p>
        ) : (
          <div className="space-y-3">
            {recentServices.map(service => {
              const car = cars.find(c => c.id === service.carId);
              return (
                <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">{service.task}</p>
                    <p className="text-sm text-gray-600">
                      {car ? `${car.make} ${car.model}` : 'Unknown Car'} • {new Date(service.date).toLocaleDateString()}
                    </p>
                  </div>
                  {service.oilService && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
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

// Add Service View Component
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

      for (const photo of photos) {
        const fullImage = await compressImage(photo, 2000);
        const thumbnail = await compressImage(photo, 300);
        
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

      const serviceData = {
        ...formData,
        userId: user.uid,
        odometer: parseInt(formData.odometer) || 0,
        photoURLs,
        thumbnailURLs,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'services'), serviceData);
      setServices([{ id: docRef.id, ...serviceData }, ...services]);

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
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Add Service Entry</h1>
      
      <div className="bg-white rounded-xl shadow-sm p-6 border space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Car *</label>
          <select
            value={formData.carId}
            onChange={(e) => setFormData({ ...formData, carId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Task *</label>
          <input
            type="text"
            value={formData.task}
            onChange={(e) => setFormData({ ...formData, task: e.target.value })}
            placeholder="e.g., Annual Service, Brake Replacement"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description / Notes</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            placeholder="Enter detailed notes about this service..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="oilService"
            checked={formData.oilService}
            onChange={(e) => setFormData({ ...formData, oilService: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="oilService" className="text-sm font-medium text-gray-700">
            Oil Service (oil was changed)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Odometer (km)</label>
          <input
            type="number"
            value={formData.odometer}
            onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
            placeholder="e.g., 45000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          <div className="space-y-3">
            {formData.parts.map((part, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={part.description}
                  onChange={(e) => updatePart(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={part.partNumber}
                  onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                  placeholder="Part #"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {photos.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">{photos.length} photo(s) selected</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {uploading ? 'Adding Service...' : 'Add Service Entry'}
        </button>
      </div>
    </div>
  );
}

// Service History View Component
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
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Service History</h1>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <p className="text-gray-600 mb-4">Select a car to view its service history:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cars.map(car => (
              <button
                key={car.id}
                onClick={() => setSelectedCar(car)}
                className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
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
    <div>
      <div className="mb-8">
        <button
          onClick={() => setSelectedCar(null)}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to car selection
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {selectedCar.make} {selectedCar.model} - Service History
        </h1>
        <p className="text-gray-600 mt-2">{filteredServices.length} service entries</p>
      </div>

      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border text-center">
          <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No service entries for this car yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map(service => (
            <div key={service.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-800">{service.task}</h3>
                      {service.oilService && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                          Oil Change
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(service.date).toLocaleDateString()}
                      </span>
                      {service.odometer > 0 && (
                        <span className="flex items-center gap-1">
                          <Gauge className="w-4 h-4" />
                          {service.odometer.toLocaleString()} km
                        </span>
                      )}
                      {service.photoURLs && service.photoURLs.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera className="w-4 h-4" />
                          {service.photoURLs.length} photo(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(service);
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Export this service"
                    >
                      <Download className="w-5 h-5" />
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
                <div className="px-6 pb-6 border-t bg-gray-50">
                  {service.description && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Description / Notes</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{service.description}</p>
                    </div>
                  )}

                  {service.parts && service.parts.some(p => p.description) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Parts Used</h4>
                      <div className="space-y-2">
                        {service.parts.filter(p => p.description).map((part, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border">
                            <p className="font-medium text-gray-800">{part.description}</p>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                              {part.partNumber && <span>Part #: {part.partNumber}</span>}
                              {part.quantity && <span>Qty: {part.quantity}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {service.thumbnailURLs && service.thumbnailURLs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Photos</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {service.thumbnailURLs.map((thumb, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={thumb}
                              alt={`Service photo ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition"
                              onClick={() => setLightboxImage(service.photoURLs[idx])}
                            />
                            
                              href={service.photoURLs[idx]}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition"
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-gray-700" />
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
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
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

// Manage Cars View Component
function ManageCarsView({ cars, setCars, user }) {
  const [editingCar, setEditingCar] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    variant: '',
    year: '',
    acquisitionDate: '',
    vin: '',
    plates: [{ plate: '', from: '', to: '' }],
    sharingEnabled: false,
    shareId: ''
  });
  const [carPhoto, setCarPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = (car) => {
    setEditingCar(car);
    setFormData({
      make: car.make || '',
      model: car.model || '',
      variant: car.variant || '',
      year: car.year || '',
      acquisitionDate: car.acquisitionDate || '',
      vin: car.vin || '',
      plates: car.plates || [{ plate: '', from: '', to: '' }],
      sharingEnabled: car.sharingEnabled || false,
      shareId: car.shareId || ''
    });
    setShowForm(true);
  };

  const addPlate = () => {
    setFormData({
      ...formData,
      plates: [...formData.plates, { plate: '', from: '', to: '' }]
    });
  };

  const removePlate = (index) => {
    const newPlates = formData.plates.filter((_, i) => i !== index);
    setFormData({ ...formData, plates: newPlates });
  };

  const updatePlate = (index, field, value) => {
    const newPlates = [...formData.plates];
    newPlates[index][field] = value;
    setFormData({ ...formData, plates: newPlates });
  };

  const handleSubmit = async () => {
    setUploading(true);

    try {
      let photoURL = editingCar?.photoURL || '';

      if (carPhoto) {
        const compressedPhoto = await compressImage(carPhoto, 1000);
        const photoRef = ref(storage, `users/${user.uid}/cars/${Date.now()}-${carPhoto.name}`);
        await uploadBytes(photoRef, compressedPhoto);
        photoURL = await getDownloadURL(photoRef);
      }

      const carData = {
        ...formData,
        userId: user.uid,
        photoURL,
        year: parseInt(formData.year) || 0,
        updatedAt: serverTimestamp()
      };

      if (editingCar) {
        await updateDoc(doc(db, 'cars', editingCar.id), carData);
        setCars(cars.map(c => c.id === editingCar.id ? { ...c, ...carData } : c));
      } else {
        const docRef = await addDoc(collection(db, 'cars'), { ...carData, createdAt: serverTimestamp() });
        setCars([...cars, { id: docRef.id, ...carData }]);
      }

      setShowForm(false);
      setEditingCar(null);
      setFormData({
        make: '',
        model: '',
        variant: '',
        year: '',
        acquisitionDate: '',
        vin: '',
        plates: [{ plate: '', from: '', to: '' }],
        sharingEnabled: false,
        shareId: ''
      });
      setCarPhoto(null);
    } catch (error) {
      console.error('Error saving car:', error);
      alert('Error saving car. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteCar = async (carId) => {
    if (!confirm('Are you sure you want to delete this car? This cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'cars', carId));
      setCars(cars.filter(c => c.id !== carId));
    } catch (error) {
      console.error('Error deleting car:', error);
      alert('Error deleting car. Please try again.');
    }
  };

  const toggleSharing = async (car) => {
    try {
      const newSharingEnabled = !car.sharingEnabled;
      const shareId = newSharingEnabled && !car.shareId ? crypto.randomUUID() : car.shareId;

      await updateDoc(doc(db, 'cars', car.id), {
        sharingEnabled: newSharingEnabled,
        shareId: shareId
      });

      setCars(cars.map(c => c.id === car.id ? { ...c, sharingEnabled: newSharingEnabled, shareId } : c));
    } catch (error) {
      console.error('Error toggling sharing:', error);
      alert('Error updating sharing settings.');
    }
  };

  const regenerateShareLink = async (car) => {
    if (!confirm('This will invalidate the old link. Continue?')) return;

    try {
      const newShareId = crypto.randomUUID();
      await updateDoc(doc(db, 'cars', car.id), { shareId: newShareId });
      setCars(cars.map(c => c.id === car.id ? { ...c, shareId: newShareId } : c));
      alert('New share link generated!');
    } catch (error) {
      console.error('Error regenerating link:', error);
    }
  };

  const copyShareLink = (shareId) => {
    const link = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Cars</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCar(null);
            setFormData({
              make: '',
              model: '',
              variant: '',
              year: '',
              acquisitionDate: '',
              vin: '',
              plates: [{ plate: '', from: '', to: '' }],
              sharingEnabled: false,
              shareId: ''
            });
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Car
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {editingCar ? 'Edit Car' : 'Add New Car'}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make *</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Variant</label>
                <input
                  type="text"
                  value={formData.variant}
                  onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Acquisition</label>
                <input
                  type="date"
                  value={formData.acquisitionDate}
                  onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VIN</label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">License Plates</label>
                <button
                  type="button"
                  onClick={addPlate}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Plate
                </button>
              </div>
              <div className="space-y-3">
                {formData.plates.map((plate, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={plate.plate}
                      onChange={(e) => updatePlate(index, 'plate', e.target.value)}
                      placeholder="License plate"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={plate.from}
                      onChange={(e) => updatePlate(index, 'from', e.target.value)}
                      placeholder="From"
                      className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={plate.to}
                      onChange={(e) => updatePlate(index, 'to', e.target.value)}
                      placeholder="To (optional)"
                      className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.plates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlate(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Car Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCarPhoto(e.target.files[0])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {uploading ? 'Saving...' : editingCar ? 'Update Car' : 'Add Car'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCar(null);
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cars.map(car => (
          <div key={car.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {car.photoURL && (
              <img src={car.photoURL} alt={`${car.make} ${car.model}`} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {car.make} {car.model} {car.variant}
              </h3>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>Year: {car.year}</p>
                {car.vin && <p>VIN: {car.vin}</p>}
                {car.acquisitionDate && <p>Acquired: {new Date(car.acquisitionDate).toLocaleDateString()}</p>}
                {car.plates && car.plates.length > 0 && (
                  <p>Current Plate: {car.plates.find(p => !p.to)?.plate || car.plates[0].plate}</p>
                )}
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Public Sharing</span>
                  <button
                    onClick={() => toggleSharing(car)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      car.sharingEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        car.sharingEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {car.sharingEnabled && car.shareId && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyShareLink(car.shareId)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </button>
                      <button
                        onClick={() => regenerateShareLink(car)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        title="Regenerate Link"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(car)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => deleteCar(car.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cars.length === 0 && !showForm && (
        <div className="bg-white rounded-xl shadow-sm p-8 border text-center">
          <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No cars added yet. Click "Add Car" to get started!</p>
        </div>
      )}
    </div>
  );
}

// Public Share View Component
function PublicShareView({ car, services }) {
  const [expandedService, setExpandedService] = useState(null);
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Public Service History</h1>
          </div>
          <p className="text-blue-100">View-only access</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          {car.photoURL && (
            <img src={car.photoURL} alt={`${car.make} ${car.model}`} className="w-full h-64 object-cover rounded-lg mb-4" />
          )}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {car.make} {car.model} {car.variant}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Year:</span> {car.year}
            </div>
            {car.vin && (
              <div>
                <span className="font-medium">VIN:</span> {car.vin}
              </div>
            )}
            {car.plates && car.plates.length > 0 && (
              <div>
                <span className="font-medium">License Plate:</span> {car.plates.find(p => !p.to)?.plate || car.plates[0].plate}
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-4">Service History ({services.length} entries)</h3>

        {services.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 border text-center">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No service entries available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map(service => (
              <div key={service.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-semibold text-gray-800">{service.task}</h4>
                        {service.oilService && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                            Oil Change
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(service.date).toLocaleDateString()}
                        </span>
                        {service.odometer > 0 && (
                          <span className="flex items-center gap-1">
                            <Gauge className="w-4 h-4" />
                            {service.odometer.toLocaleString()} km
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedService === service.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </div>

                {expandedService === service.id && (
                  <div className="px-6 pb-6 border-t bg-gray-50">
                    {service.description && (
                      <div className="mt-4">
                        <h5 className="font-semibold text-gray-800 mb-2">Notes</h5>
                        <p className="text-gray-700 whitespace-pre-wrap">{service.description}</p>
                      </div>
                    )}

                    {service.parts && service.parts.some(p => p.description) && (
                      <div className="mt-4">
                        <h5 className="font-semibold text-gray-800 mb-2">Parts Used</h5>
                        <div className="space-y-2">
                          {service.parts.filter(p => p.description).map((part, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border">
                              <p className="font-medium text-gray-800">{part.description}</p>
                              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                {part.partNumber && <span>Part #: {part.partNumber}</span>}
                                {part.quantity && <span>Qty: {part.quantity}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {service.thumbnailURLs && service.thumbnailURLs.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-semibold text-gray-800 mb-2">Photos</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {service.thumbnailURLs.map((thumb, idx) => (
                            <img
                              key={idx}
                              src={thumb}
                              alt={`Service photo ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition"
                              onClick={() => setLightboxImage(service.photoURLs[idx])}
                            />
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

        <div className="mt-8 text-center text-gray-500 text-sm">
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