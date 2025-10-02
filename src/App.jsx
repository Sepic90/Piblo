import React, { useState, useEffect } from 'react';
import { Car, Wrench, Plus, History, Settings, LogOut, Calendar, Upload, X, Menu, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
      
      // Load cars - NO orderBy to avoid index requirement
      const carsQuery = query(collection(db, 'cars'), where('userId', '==', userId));
      const carsSnapshot = await getDocs(carsQuery);
      const carsData = carsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Loaded cars:', carsData.length);
      setCars(carsData);

      // Load services - NO orderBy, sort manually instead
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
    return <PublicCarView car={selectedCar} services={services} />;
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-blue-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-6 h-6" />
          <span className="font-bold text-lg">Piblo</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
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
        {/* Left Sidebar - Desktop */}
        <div className="hidden lg:block w-56 bg-white h-screen sticky top-0 border-r shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Car className="w-7 h-7 text-blue-600" />
              <span className="font-bold text-lg text-gray-800">Piblo</span>
            </div>
          </div>
          <Navigation currentView={currentView} setCurrentView={setCurrentView} />
        </div>

        {/* Main Content */}
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
      <div className="mt-4 pt-3 border-t">
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

function DashboardView({ cars, services, setCurrentView }) {
  const [expandedService, setExpandedService] = useState(null);
  const totalServices = services.length;
  const recentServices = services.slice(0, 5);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-3">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded-lg shadow-sm p-3 border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{cars.length}</p>
              <p className="text-xs text-gray-600">Cars</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 border">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Wrench className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{totalServices}</p>
              <p className="text-xs text-gray-600">Total Services</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{services.filter(s => s.oilService).length}</p>
              <p className="text-xs text-gray-600">Oil Changes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 border">
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
          <p className="text-gray-500 text-center py-6 text-sm">No services recorded yet</p>
        ) : (
          <div className="space-y-2">
            {recentServices.map(service => {
              const car = cars.find(c => c.id === service.carId);
              return (
                <div key={service.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {car?.color && (
                            <div
                              className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: car.color }}
                            />
                          )}
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
                          {car && (
                            <span>{car.nickname || `${car.make} ${car.model}`}</span>
                          )}
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
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Parts:</p>
                          <div className="space-y-1">
                            {service.parts.map((part, idx) => (
                              <div key={idx} className="text-xs text-gray-600">
                                <span className="font-medium">{part.description}</span>
                                {part.partNumber && <span className="text-gray-500"> (#{part.partNumber})</span>}
                                {part.quantity && <span> × {part.quantity}</span>}
                              </div>
                            ))}
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
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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

function ServiceHistoryView({ cars, services, selectedCar, setSelectedCar }) {
  const [expandedService, setExpandedService] = useState(null);

  const filteredServices = selectedCar
    ? services.filter(s => s.carId === selectedCar.id)
    : [];

  if (!selectedCar) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Service History</h1>
        <div className="bg-white rounded-lg shadow-sm p-3 border">
          <p className="text-gray-600 mb-3 text-sm">Select a car to view its service history:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cars.map(car => (
              <button
                key={car.id}
                onClick={() => setSelectedCar(car)}
                className="text-left p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  {car.color && (
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: car.color }}
                    />
                  )}
                  <p className="font-semibold text-gray-800 text-sm">
                    {car.nickname || `${car.make} ${car.model}`}
                  </p>
                </div>
                <p className="text-xs text-gray-600">{car.variant} • {car.year}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-3">
        <button
          onClick={() => setSelectedCar(null)}
          className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1 text-sm"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          {selectedCar.color && (
            <div
              className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: selectedCar.color }}
            />
          )}
          <h1 className="text-2xl font-bold text-gray-800">
            {selectedCar.nickname || `${selectedCar.make} ${selectedCar.model}`}
          </h1>
        </div>
        <p className="text-gray-600 mt-1 text-sm">{filteredServices.length} service entries</p>
      </div>

      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 border text-center">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No service entries for this car yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredServices.map(service => (
            <div key={service.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-gray-50 transition"
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
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Parts:</p>
                      <div className="space-y-1">
                        {service.parts.map((part, idx) => (
                          <div key={idx} className="text-xs text-gray-600">
                            <span className="font-medium">{part.description}</span>
                            {part.partNumber && <span className="text-gray-500"> (#{part.partNumber})</span>}
                            {part.quantity && <span> × {part.quantity}</span>}
                          </div>
                        ))}
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
                            onClick={() => window.open(url, '_blank')}
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
      
      // Add to beginning and sort
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
      <h1 className="text-2xl font-bold text-gray-800 mb-3">Add Service Entry</h1>

      <div className="bg-white rounded-lg shadow-sm p-4 border space-y-3">
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
                {car.nickname || `${car.make} ${car.model} ${car.variant}`} ({car.year})
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Any additional notes..."
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (km)</label>
          <input
            type="number"
            value={formData.odometer}
            onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
            placeholder="Current mileage"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.oilService}
            onChange={(e) => setFormData({ ...formData, oilService: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm font-medium text-gray-700">Oil Service</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parts Used</label>
          {formData.parts.map((part, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={part.description}
                onChange={(e) => updatePart(index, 'description', e.target.value)}
                placeholder="Part description"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                value={part.partNumber}
                onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                placeholder="Part #"
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="number"
                value={part.quantity}
                onChange={(e) => updatePart(index, 'quantity', e.target.value)}
                placeholder="Qty"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {formData.parts.length > 1 && (
                <button
                  onClick={() => removePart(index)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addPart}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Part
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
            <Upload className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              {photos.length > 0 ? `${photos.length} photo(s) selected` : 'Click to upload photos'}
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 text-sm"
        >
          {loading ? 'Adding Service...' : 'Add Service Entry'}
        </button>
      </div>
    </div>
  );
}

function ManageCarsView({ cars, setCars, user }) {
  const [editingCar, setEditingCar] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    make: '',
    model: '',
    variant: '',
    year: '',
    acquisitionDate: '',
    vin: '',
    color: '#3B82F6',
    plates: [{ plate: '', from: '', to: '' }],
    sharingEnabled: false,
    shareId: ''
  });
  const [carPhoto, setCarPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const startEdit = (car) => {
    setEditingCar(car);
    setFormData({
      nickname: car.nickname || '',
      make: car.make || '',
      model: car.model || '',
      variant: car.variant || '',
      year: car.year || '',
      acquisitionDate: car.acquisitionDate || '',
      vin: car.vin || '',
      color: car.color || '#3B82F6',
      plates: car.plates || [{ plate: '', from: '', to: '' }],
      sharingEnabled: car.sharingEnabled || false,
      shareId: car.shareId || ''
    });
    setShowForm(true);
  };

  const startAdd = () => {
    setEditingCar(null);
    setFormData({
      nickname: '',
      make: '',
      model: '',
      variant: '',
      year: '',
      acquisitionDate: '',
      vin: '',
      color: '#3B82F6',
      plates: [{ plate: '', from: '', to: '' }],
      sharingEnabled: false,
      shareId: ''
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCar(null);
    setCarPhoto(null);
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
      
      if (carPhoto) {
        const resized = await resizeImage(carPhoto, 1000);
        const photoRef = ref(storage, `users/${user.uid}/cars/${Date.now()}-${carPhoto.name}`);
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

      cancelForm();
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
      const newSharing = !car.sharingEnabled;
      const newShareId = newSharing && !car.shareId ? crypto.randomUUID() : car.shareId;
      
      await updateDoc(doc(db, 'cars', car.id), {
        sharingEnabled: newSharing,
        shareId: newShareId
      });
      
      setCars(cars.map(c => 
        c.id === car.id ? { ...c, sharingEnabled: newSharing, shareId: newShareId } : c
      ));
    } catch (error) {
      console.error('Error toggling sharing:', error);
      alert('Error updating sharing settings.');
    }
  };

  const copyShareLink = (shareId) => {
    const link = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-gray-800">Manage Cars</h1>
        {!showForm && (
          <button
            onClick={startAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Car
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-lg shadow-sm p-4 border space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingCar ? 'Edit Car' : 'Add New Car'}
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="e.g., Daily Driver, Weekend Car"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-20 h-10 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                placeholder="e.g., Toyota"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Camry"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
              <input
                type="text"
                value={formData.variant}
                onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                placeholder="e.g., SE, Hybrid"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="e.g., 2020"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              placeholder="Vehicle Identification Number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
            <input
              type="date"
              value={formData.acquisitionDate}
              onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plates</label>
            {formData.plates.map((plate, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={plate.plate}
                  onChange={(e) => updatePlate(index, 'plate', e.target.value)}
                  placeholder="Plate number"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="date"
                  value={plate.from}
                  onChange={(e) => updatePlate(index, 'from', e.target.value)}
                  placeholder="From"
                  className="w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="date"
                  value={plate.to}
                  onChange={(e) => updatePlate(index, 'to', e.target.value)}
                  placeholder="To"
                  className="w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {formData.plates.length > 1 && (
                  <button
                    onClick={() => removePlate(index)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPlate}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Plate
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Car Photo</label>
            <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
              <Upload className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">
                {carPhoto ? carPhoto.name : 'Click to upload photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCarPhoto(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 text-sm"
            >
              {loading ? 'Saving...' : editingCar ? 'Update Car' : 'Add Car'}
            </button>
            <button
              onClick={cancelForm}
              className="px-6 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {cars.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 border text-center">
              <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No cars added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cars.map(car => (
                <div key={car.id} className="bg-white rounded-lg shadow-sm border p-4">
                  {car.photoURL && (
                    <img
                      src={car.photoURL}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    {car.color && (
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: car.color }}
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-800">
                      {car.nickname || `${car.make} ${car.model}`}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {car.make} {car.model} {car.variant} • {car.year}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(car)}
                      className="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(car.id)}
                      className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Public Sharing</span>
                      <button
                        onClick={() => toggleSharing(car)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          car.sharingEnabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {car.sharingEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    {car.sharingEnabled && car.shareId && (
                      <button
                        onClick={() => copyShareLink(car.shareId)}
                        className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Copy Public Link
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
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
                        <h3 className="text-lg font-semibold text-gray-800">{service.task}</h3>
                        {service.oilService && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                            Oil
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(service.date).toLocaleDateString()}
                        </span>
                        {service.odometer > 0 && (
                          <span>{service.odometer.toLocaleString()} km</span>
                        )}
                      </div>
                    </div>
                    {expandedService === service.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedService === service.id && (
                  <div className="px-4 pb-4 border-t bg-gray-50">
                    {service.description && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                    )}

                    {service.parts && service.parts.length > 0 && service.parts[0].description && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Parts:</p>
                        <div className="space-y-1">
                          {service.parts.map((part, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              <span className="font-medium">{part.description}</span>
                              {part.partNumber && <span className="text-gray-500"> (#{part.partNumber})</span>}
                              {part.quantity && <span> × {part.quantity}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {service.photoURLs && service.photoURLs.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Photos:</p>
                        <div className="flex gap-2 flex-wrap">
                          {service.photoURLs.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Service ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => window.open(url, '_blank')}
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
    </div>
  );
}