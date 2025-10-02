import React, { useState, useEffect } from 'react';
import { Car, Wrench, Plus, History, Settings, LogOut, Calendar, Upload, X, Menu, ChevronDown, ChevronUp, Eye, Download } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

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

const resizeImage = (file, maxSize) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [cars, setCars] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      
      const carsQuery = query(collection(db, 'cars'), where('userId', '==', userId));
      const carsSnapshot = await getDocs(carsQuery);
      const carsData = carsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Loaded cars:', carsData.length);
      setCars(carsData);

      const servicesQuery = query(collection(db, 'services'), where('userId', '==', userId));
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
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

        // Filter services by the specific car ID
        const servicesQuery = query(collection(db, 'services'), where('carId', '==', carData.id));
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
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
    return <PublicCarView car={selectedCar} services={services} />;
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <Navigation 
            currentView={currentView} 
            setCurrentView={(view) => {
              setCurrentView(view);
              setMobileMenuOpen(false);
            }} 
          />
        </div>
      )}

      <div className="flex">
        <div className="hidden lg:block w-56 bg-white h-screen sticky top-0 border-r shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Car className="w-7 h-7 text-blue-600" />
              <span className="font-bold text-lg text-gray-800">Piblo</span>
            </div>
          </div>
          <Navigation currentView={currentView} setCurrentView={setCurrentView} />
        </div>

        <div className="flex-1 p-3 lg:p-6">
          {currentView === 'dashboard' && (
            <DashboardView cars={cars} services={services} setCurrentView={setCurrentView} />
          )}
          {currentView === 'add-service' && (
            <AddServiceView cars={cars} services={services} setServices={setServices} user={user} />
          )}
          {currentView === 'service-history' && (
            <ServiceHistoryView 
              cars={cars} 
              services={services} 
              selectedCar={selectedCar} 
              setSelectedCar={setSelectedCar} 
            />
          )}
          {currentView === 'manage-cars' && (
            <ManageCarsView cars={cars} setCars={setCars} user={user} />
          )}
        </div>
      </div>
    </div>
  );
}

function Navigation({ currentView, setCurrentView }) {
  return (
    <nav className="p-3">
      <button
        onClick={() => setCurrentView('dashboard')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition text-sm ${
          currentView === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Car className="w-5 h-5" />
        <span>Dashboard</span>
      </button>
      <button
        onClick={() => setCurrentView('add-service')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition text-sm ${
          currentView === 'add-service' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Plus className="w-5 h-5" />
        <span>Add Service</span>
      </button>
      <button
        onClick={() => setCurrentView('service-history')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition text-sm ${
          currentView === 'service-history' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <History className="w-5 h-5" />
        <span>Service History</span>
      </button>
      <button
        onClick={() => setCurrentView('manage-cars')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition text-sm ${
          currentView === 'manage-cars' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span>Manage Cars</span>
      </button>

      <div className="mt-6 pt-3 border-t">
        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition text-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

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
    </div>
  );
}

function PublicCarView({ car, services }) {
  const [expandedService, setExpandedService] = useState(null);
  const [imageModal, setImageModal] = useState(null);

  if (!car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Car not found or not available for public viewing.</p>
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
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {car.photoURL && (
            <img
              src={car.photoURL}
              alt={`${car.make} ${car.model}`}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}
          <div className="flex items-center gap-2 mb-2">
            {car.color && (
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: car.color }}
              />
            )}
            <h2 className="text-2xl font-bold text-gray-800">
              {car.nickname || `${car.make} ${car.model} ${car.variant}`}
            </h2>
          </div>
          <p className="text-gray-600">
            {car.make} {car.model} {car.variant} • {car.year}
          </p>
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Service History ({services.length} entries)
        </h3>

        {services.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 border text-center">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No service entries available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(service => (
              <div key={service.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-800">{service.task}</h3>
                        {service.oilService && (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                            Oil
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(service.date).toLocaleDateString()}
                        </span>
                        {service.odometer > 0 && (
                          <span>{service.odometer.toLocaleString()} km</span>
                        )}
                      </div>
                    </div>
                    {expandedService === service.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {expandedService === service.id && (
                  <div className="px-3 pb-3 border-t bg-gray-50">
                    {service.description && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Description:</p>
                        <p className="text-xs text-gray-600">{service.description}</p>
                      </div>
                    )}

                    {service.parts && service.parts.length > 0 && service.parts[0].description && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Parts Used:</p>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white border border-gray-200 text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Description</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Part Number</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {service.parts.filter(part => part.description).map((part, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                  <td className="px-3 py-2">{part.description}</td>
                                  <td className="px-3 py-2 text-gray-600">{part.partNumber || '-'}</td>
                                  <td className="px-3 py-2 text-gray-600">{part.quantity || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {service.photoURLs && service.photoURLs.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Photos:</p>
                        <div className="flex gap-2 flex-wrap">
                          {service.photoURLs.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Service ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => setImageModal(url)}
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
      </div>

      {imageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <img src={imageModal} alt="Full size" className="max-w-full max-h-full object-contain" />
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
            onClick={() => setImageModal(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardView({ cars, services, setCurrentView }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <Car className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Cars</p>
              <p className="text-3xl font-bold text-gray-800">{cars.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-lg">
              <Wrench className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Service Entries</p>
              <p className="text-3xl font-bold text-gray-800">{services.length}</p>
            </div>
          </div>
        </div>
      </div>

      {cars.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border text-center">
          <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No cars yet</h3>
          <p className="text-gray-600 mb-6">Add your first car to start tracking its service history</p>
          <button
            onClick={() => setCurrentView('manage-cars')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Add Your First Car
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Service History</h2>
          <div className="bg-white rounded-xl shadow-sm border">
            {services.slice(0, 5).map((service, index) => {
              const car = cars.find(c => c.id === service.carId);
              return (
                <div key={service.id} className={`p-4 ${index !== 0 ? 'border-t' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{service.task}</h3>
                      <p className="text-sm text-gray-600">
                        {car ? `${car.make} ${car.model}` : 'Unknown car'} • {new Date(service.date).toLocaleDateString()}
                      </p>
                    </div>
                    {service.oilService && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                        Oil Change
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {services.length === 0 && (
              <div className="p-8 text-center">
                <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No service entries yet</p>
              </div>
            )}
          </div>
        </div>
      )}
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
    parts: [{ description: '', partNumber: '', quantity: '' }]
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
  };

  const handleSubmit = async () => {
    if (!formData.carId) {
      alert('Please select a car');
      return;
    }

    setLoading(true);
    try {
      const photoURLs = [];
      const thumbnailURLs = [];

      for (const photo of photos) {
        const resizedPhoto = await resizeImage(photo, 2000);
        const thumbnail = await resizeImage(photo, 300);
        
        const timestamp = Date.now();
        const photoRef = ref(storage, `users/${user.uid}/services/${timestamp}-${photo.name}`);
        const thumbRef = ref(storage, `users/${user.uid}/services/${timestamp}-thumb-${photo.name}`);
        
        await uploadBytes(photoRef, resizedPhoto);
        await uploadBytes(thumbRef, thumbnail);
        
        const photoURL = await getDownloadURL(photoRef);
        const thumbURL = await getDownloadURL(thumbRef);
        
        photoURLs.push(photoURL);
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
      const newService = { id: docRef.id, ...serviceData };
      
      const updatedServices = [newService, ...services];
      updatedServices.sort((a, b) => new Date(b.date) - new Date(a.date));
      setServices(updatedServices);

      setFormData({
        carId: '',
        date: new Date().toISOString().split('T')[0],
        task: '',
        description: '',
        oilService: false,
        odometer: '',
        parts: [{ description: '', partNumber: '', quantity: '' }]
      });
      setPhotos([]);
      alert('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Error adding service. Please try again.');
    } finally {
      setLoading(false);
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                    <X className="w-4 h-4" />
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
            onChange={handlePhotoChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {photos.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">{photos.length} photo(s) selected</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? 'Adding Service...' : 'Add Service Entry'}
        </button>
      </div>
    </div>
  );
}

function ServiceHistoryView({ cars, services, selectedCar, setSelectedCar }) {
  const [expandedService, setExpandedService] = useState(null);
  const [imageModal, setImageModal] = useState(null);

  const filteredServices = selectedCar
    ? services.filter(s => s.carId === selectedCar.id)
    : [];

  const exportServiceData = async (car) => {
    try {
      const carServices = services.filter(s => s.carId === car.id);
      
      if (carServices.length === 0) {
        alert('No service entries to export for this car.');
        return;
      }

      const zip = new JSZip();
      
      for (let i = 0; i < carServices.length; i++) {
        const service = carServices[i];
        const folderName = `${i + 1}_${service.date}_${service.task.replace(/[^a-z0-9]/gi, '_')}`;
        const serviceFolder = zip.folder(folderName);
        
        // Create Excel file for service data
        const wsData = [
          ['Service Entry Details'],
          [''],
          ['Date', service.date],
          ['Task', service.task],
          ['Description', service.description || ''],
          ['Odometer (km)', service.odometer || ''],
          ['Oil Service', service.oilService ? 'Yes' : 'No'],
          [''],
          ['Parts/Consumables Used'],
          ['Description', 'Part Number', 'Quantity']
        ];
        
        if (service.parts && service.parts.length > 0) {
          service.parts.forEach(part => {
            if (part.description) {
              wsData.push([
                part.description,
                part.partNumber || '',
                part.quantity || ''
              ]);
            }
          });
        }
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Service Data');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        serviceFolder.file('service_data.xlsx', excelBuffer);
        
        // Download and add photos
        if (service.photoURLs && service.photoURLs.length > 0) {
          for (let j = 0; j < service.photoURLs.length; j++) {
            try {
              const response = await fetch(service.photoURLs[j]);
              const blob = await response.blob();
              serviceFolder.file(`photo_${j + 1}.jpg`, blob);
            } catch (error) {
              console.error(`Error downloading photo ${j + 1}:`, error);
            }
          }
        }
      }
      
      // Generate and download the ZIP file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${car.make}_${car.model}_Service_History.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('Service history exported successfully!');
    } catch (error) {
      console.error('Error exporting service data:', error);
      alert('Error exporting service data. Please try again.');
    }
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
                <p className="font-semibold text-gray-800">
                  {car.make} {car.model}
                </p>
                <p className="text-sm text-gray-600">
                  {car.variant} • {car.year}
                </p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {selectedCar.make} {selectedCar.model} - Service History
            </h1>
            <p className="text-gray-600 mt-2">{filteredServices.length} service entries</p>
          </div>
          {filteredServices.length > 0 && (
            <button
              onClick={() => exportServiceData(selectedCar)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-5 h-5" />
              Export All
            </button>
          )}
        </div>
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
                        <span>{service.odometer.toLocaleString()} km</span>
                      )}
                      {service.photoURLs && service.photoURLs.length > 0 && (
                        <span>{service.photoURLs.length} photo(s)</span>
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
                      <h4 className="font-semibold text-gray-800 mb-2">Description / Notes</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{service.description}</p>
                    </div>
                  )}

                  {service.parts && service.parts.some(p => p.description) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Parts Used</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Description</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Part Number</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {service.parts.filter(p => p.description).map((part, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-800">{part.description}</td>
                                <td className="px-4 py-3 text-gray-600">{part.partNumber || '-'}</td>
                                <td className="px-4 py-3 text-gray-600">{part.quantity || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {service.thumbnailURLs && service.thumbnailURLs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Photos</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {service.thumbnailURLs.map((thumbnail, idx) => (
                          <img
                            key={idx}
                            src={thumbnail}
                            alt={`Service photo ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition"
                            onClick={() => setImageModal(service.photoURLs[idx])}
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

      {imageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <img src={imageModal} alt="Full size" className="max-w-full max-h-full object-contain" />
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
            onClick={() => setImageModal(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}

function ManageCarsView({ cars, setCars, user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
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
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEdit = (car) => {
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
    setLoading(true);
    try {
      let photoURL = editingCar?.photoURL || '';
      
      if (photoFile) {
        const resized = await resizeImage(photoFile, 1000);
        const photoRef = ref(storage, `users/${user.uid}/cars/${Date.now()}-${photoFile.name}`);
        await uploadBytes(photoRef, resized);
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
        const docRef = await addDoc(collection(db, 'cars'), {
          ...carData,
          createdAt: serverTimestamp()
        });
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
      setPhotoFile(null);
    } catch (error) {
      console.error('Error saving car:', error);
      alert('Error saving car. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (carId) => {
    if (confirm('Are you sure you want to delete this car? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'cars', carId));
        setCars(cars.filter(c => c.id !== carId));
      } catch (error) {
        console.error('Error deleting car:', error);
        alert('Error deleting car. Please try again.');
      }
    }
  };

  const toggleSharing = async (car) => {
    try {
      const newSharingEnabled = !car.sharingEnabled;
      const shareId = newSharingEnabled && !car.shareId ? crypto.randomUUID() : car.shareId;
      
      await updateDoc(doc(db, 'cars', car.id), {
        sharingEnabled: newSharingEnabled,
        shareId
      });
      
      setCars(cars.map(c => c.id === car.id ? { ...c, sharingEnabled: newSharingEnabled, shareId } : c));
    } catch (error) {
      console.error('Error toggling sharing:', error);
      alert('Error updating sharing settings.');
    }
  };

  const regenerateLink = async (car) => {
    if (confirm('This will invalidate the old link. Continue?')) {
      try {
        const shareId = crypto.randomUUID();
        await updateDoc(doc(db, 'cars', car.id), { shareId });
        setCars(cars.map(c => c.id === car.id ? { ...c, shareId } : c));
        alert('New share link generated!');
      } catch (error) {
        console.error('Error regenerating link:', error);
      }
    }
  };

  const copyShareLink = (shareId) => {
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url);
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
                        <X className="w-4 h-4" />
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
                onChange={(e) => setPhotoFile(e.target.files[0])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : (editingCar ? 'Update Car' : 'Add Car')}
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
        {cars.map(car => {
          const currentPlate = car.plates?.find(p => !p.to) || car.plates?.[0];
          return (
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
                  {car.acquisitionDate && (
                    <p>Acquired: {new Date(car.acquisitionDate).toLocaleDateString()}</p>
                  )}
                  {currentPlate && <p>Current Plate: {currentPlate.plate}</p>}
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
                          <Eye className="w-4 h-4" />
                          Copy Link
                        </button>
                        <button
                          onClick={() => regenerateLink(car)}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                          title="Regenerate Link"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(car)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Settings className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(car.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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