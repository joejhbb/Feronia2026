import { useState, useEffect, MouseEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PawPrint, 
  Home, 
  Heart, 
  Dna, 
  Box, 
  BarChart3, 
  TrendingUp, 
  Pencil, 
  Clipboard, 
  CheckCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Instagram, 
  Youtube, 
  Play,
  ArrowRight,
  Sun,
  Moon,
  X,
  Menu,
  Building,
  MessageSquare,
  User
} from 'lucide-react';

interface LaunchPageProps {
  onLoginClick: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export default function LaunchPage({ onLoginClick, isDarkMode, setIsDarkMode }: LaunchPageProps) {
  const [activeSection, setActiveSection] = useState('home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // Mobile responsiveness & Collaboration modal states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabForm, setCollabForm] = useState({
    name: '',
    email: '',
    organization: '',
    type: 'Partnership',
    message: ''
  });
  const [isCollabSubmitted, setIsCollabSubmitted] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState('');

  const handleCollabSubmit = (e: FormEvent) => {
    e.preventDefault();
    const refId = 'FRN-COLLAB-' + Math.floor(100000 + Math.random() * 900000);
    setSubmittedRefId(refId);
    setIsCollabSubmitted(true);
    
    try {
      const existing = localStorage.getItem('feronia_collab_requests');
      const list = existing ? JSON.parse(existing) : [];
      list.push({
        refId,
        ...collabForm,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('feronia_collab_requests', JSON.stringify(list));
    } catch (err) {
      console.error("Error storing collaboration request:", err);
    }
  };

  const slides = [
    {
      url: "https://images.pexels.com/photos/9936985/pexels-photo-9936985.jpeg?_gl=1*1ai8lxn*_ga*MTE1ODI5MjY5My4xNzkxMTY0MTMz*_ga_8JE65Q40S6*czE3OTExNjQxMzIkbzEkZzEkdDE3OTExNjQzMTAkajUxJGwwJGgw",
      alt: "Majestic Python in natural wildlife sanctuary enclosure"
    },
    {
      url: "https://images.pexels.com/photos/27084020/pexels-photo-27084020.jpeg",
      alt: "Bearded Dragon in black background"
    },
    {
      url: "https://images.pexels.com/photos/26773562/pexels-photo-26773562.jpeg",
      alt: "Vibrant Gecko in professional vivarium"
    }
  ];

  // Auto cycle hero slides
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(slideInterval);
  }, [slides.length]);

  // Track active section on scroll or intersection
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'about', 'overview', 'contact'];
      // Use mid-viewport threshold so active section precisely reflects what's in the screen
      const scrollPosition = window.scrollY + window.innerHeight * 0.4;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (id: string, e: MouseEvent) => {
    e.preventDefault();
    setActiveSection(id);
    if (id === 'home') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const navbarHeight = 72; // 72px fixed navbar height
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`min-h-screen font-sans antialiased overflow-x-hidden pt-[72px] transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[#05160E] text-slate-100 selection:bg-emerald-800 selection:text-white' 
        : 'bg-[#F4F7F5] text-slate-800 selection:bg-emerald-100 selection:text-[#113C24]'
    }`}>
      
      {/* Navbar - Fixed top, sleek height (72px) for optimal vertical space */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md border-b shadow-xs ${
        isDarkMode 
          ? 'bg-[#05160E]/90 border-emerald-950/60 text-white' 
          : 'bg-white/95 border-slate-100/80 text-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={(e) => handleNavClick('home', e as unknown as MouseEvent)}>
            <div className={isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}>
              <PawPrint className="w-8 h-8" fill="currentColor" />
            </div>
            <div>
              <span className={`font-extrabold text-xl sm:text-2xl tracking-tight block leading-none ${isDarkMode ? 'text-white' : 'text-[#113C24]'}`}>FERONIA</span>
              <span className={`text-[8.5px] font-bold tracking-wider uppercase mt-0.5 block ${isDarkMode ? 'text-emerald-400/80' : 'text-[#113C24]/80'}`}>
                WILDLIFE FACILITY MANAGEMENT SYSTEM
              </span>
            </div>
          </div>

          <nav className="hidden md:flex space-x-8 text-sm font-bold">
            {[
              { id: 'home', label: 'Home' },
              { id: 'features', label: 'Features' },
              { id: 'about', label: 'About Us' },
              { id: 'overview', label: 'System Overview' },
              { id: 'contact', label: 'Contact Us' }
            ].map((tab) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                onClick={(e) => handleNavClick(tab.id, e)}
                className={`relative pb-1.5 transition-all duration-200 cursor-pointer ${
                  activeSection === tab.id 
                    ? (isDarkMode ? 'text-emerald-400 font-extrabold' : 'text-[#113C24] font-extrabold') 
                    : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-800 hover:text-[#113C24]')
                }`}
              >
                <span>{tab.label}</span>
                {activeSection === tab.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-emerald-400' : 'bg-[#113C24]'}`}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all cursor-pointer border ${
                isDarkMode 
                  ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 border-emerald-800/40 hover:text-emerald-300' 
                  : 'bg-emerald-50 text-[#113C24] hover:bg-emerald-100 border-emerald-100 hover:text-[#1B5234]'
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Desktop-only Login Button */}
            <button
              onClick={onLoginClick}
              className={`hidden md:flex px-5 py-2.5 text-xs font-bold rounded-full shadow-sm hover:shadow-md transition-all items-center space-x-1.5 cursor-pointer ${
                isDarkMode 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                  : 'bg-[#113C24] hover:bg-[#1B5234] text-white'
              }`}
            >
              <span>Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile-only Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-full transition-all cursor-pointer border ${
                isDarkMode 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30 hover:bg-emerald-900/45' 
                  : 'bg-emerald-50 text-[#113C24] border-emerald-100 hover:bg-emerald-100'
              }`}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`md:hidden border-t overflow-hidden transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-[#05160E] border-emerald-950/60 text-white' 
                  : 'bg-white border-slate-100 text-slate-800'
              }`}
            >
              <div className="px-4 py-6 space-y-3 flex flex-col font-bold text-sm">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'features', label: 'Features' },
                  { id: 'about', label: 'About Us' },
                  { id: 'overview', label: 'System Overview' },
                  { id: 'contact', label: 'Contact Us' }
                ].map((tab) => (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      handleNavClick(tab.id, e);
                    }}
                    className={`px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      activeSection === tab.id 
                        ? (isDarkMode ? 'bg-emerald-950/60 text-emerald-400 font-extrabold' : 'bg-emerald-50 text-[#113C24]') 
                        : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/20' : 'text-slate-600 hover:text-[#113C24] hover:bg-slate-50')
                    }`}
                  >
                    {tab.label}
                  </a>
                ))}
                
                {/* Mobile-only Login Button inside drawer */}
                <div className="pt-3 border-t border-dashed border-slate-200/50 dark:border-emerald-950/40">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLoginClick();
                    }}
                    className={`w-full py-3 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      isDarkMode 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                        : 'bg-[#113C24] hover:bg-[#1B5234] text-white'
                    }`}
                  >
                    <span>Login to System</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section with Beautiful Background Animal Slideshow - Fits exactly in one viewport frame */}
      <section id="home" className={`relative min-h-[calc(100vh-72px)] lg:h-[calc(100vh-72px)] flex items-center py-6 sm:py-8 overflow-hidden transition-colors duration-300 scroll-mt-[72px] ${
        isDarkMode ? 'bg-[#030d08]' : 'bg-[#071D11]'
      }`}>
        {/* Absolute Slideshow Background */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={slides[currentSlide].url}
                alt={slides[currentSlide].alt}
                className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.05]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>

          {/* Elegant soft gradient overlay: subtle blend on left for superb readability, highly transparent on right */}
          <div className={`absolute inset-0 bg-gradient-to-r transition-all duration-300 z-10 ${
            isDarkMode 
              ? 'from-[#05160E] via-[#05160E]/85 md:via-[#05160E]/45' 
              : 'from-[#F4F7F5] via-[#F4F7F5]/75 md:via-[#F4F7F5]/35'
          } to-transparent`} />
          <div className={`absolute inset-0 bg-gradient-to-t transition-all duration-300 z-10 ${
            isDarkMode ? 'from-[#05160E]/70' : 'from-[#F4F7F5]/50'
          } via-transparent to-transparent`} />
        </div>

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
          <div className="max-w-2xl space-y-6">
            <div className={`inline-flex items-center space-x-2 px-3.5 py-1 border rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-emerald-950/90 border-emerald-800/40 text-emerald-300' 
                : 'bg-emerald-100/95 border-emerald-200/85 text-[#113C24]'
            }`}>
              <span className="text-xs leading-none">🍃</span>
              <span>Smart. Organized. Efficient.</span>
            </div>
            
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Manage Wildlife.<br />
              <span className={isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}>Care Better.</span>
            </h1>
            
            <p className={`text-sm sm:text-base max-w-xl leading-relaxed font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              FERONIA is an all-in-one management system that helps wildlife facilities streamline animal care, manage daily operations, records, and resources in one centralized platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3.5 pt-1">
              <a
                href="#features"
                onClick={(e) => handleNavClick('features', e)}
                className={`px-7 py-3 text-xs font-bold rounded-full text-center shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 ${
                  isDarkMode 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'bg-[#113C24] hover:bg-[#1B5234] text-white'
                }`}
              >
                <span>Explore Features</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => setShowVideoModal(true)}
                className={`px-7 py-3 text-xs font-bold rounded-full text-center border-2 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
                  isDarkMode 
                    ? 'bg-emerald-950/45 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/40 hover:border-emerald-650' 
                    : 'bg-white hover:bg-slate-50 text-[#113C24] border-slate-200 hover:border-[#113C24]/40'
                }`}
              >
                <span>Watch Demo</span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors duration-300 ${
                  isDarkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-100 text-[#113C24]'
                }`}>
                  <Play className={`w-3 h-3 ml-0.5 ${isDarkMode ? 'fill-emerald-300' : 'fill-[#113C24]'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Streamlined so it fits elegantly in one viewport frame */}
      <section id="features" className={`min-h-[calc(100vh-72px)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 transition-all duration-300 relative overflow-hidden scroll-mt-[72px] ${
        isDarkMode 
          ? 'bg-gradient-to-b from-[#05160E] via-[#092618] to-[#04190F]' 
          : 'bg-gradient-to-b from-[#F4F7F5] via-white to-[#EBF2EE]'
      }`}>
        <div className={`absolute top-1/4 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${isDarkMode ? 'bg-emerald-950/20' : 'bg-emerald-50/50'}`} />
        <div className={`absolute bottom-1/4 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${isDarkMode ? 'bg-emerald-950/25' : 'bg-amber-50/50'}`} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
          <div className="text-center max-w-3xl mx-auto mb-5 sm:mb-6 space-y-1.5">
            <span className={`text-[10px] font-extrabold tracking-widest uppercase flex items-center justify-center space-x-1.5 px-3 py-0.5 rounded-full w-max mx-auto border transition-colors duration-300 ${
              isDarkMode 
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/50' 
                : 'text-[#113C24] bg-emerald-100/60 border-emerald-200/50'
            }`}>
              <span>🍃</span>
              <span>SYSTEM FEATURES</span>
              <span>🍃</span>
            </span>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Powerful modules built to elevate wildlife care
            </h2>
            <p className={`font-bold text-xs sm:text-sm max-w-xl mx-auto leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              FERONIA integrates crucial tools into a single beautifully-designed workspace, helping you automate daily workflows with maximum efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
            {/* Animal Management */}
            <div className={`group rounded-xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full transform hover:-translate-y-0.5 ${
              isDarkMode 
                ? 'bg-[#092618]/60 border-emerald-950 hover:border-emerald-500/40' 
                : 'bg-white border-slate-200/90 hover:border-emerald-500/30'
            }`}>
              <div className="relative h-16 sm:h-20 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&q=80&w=600"
                  alt="Majestic Wildlife"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className={`absolute top-1.5 right-2 px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase rounded-full border shadow-xs ${
                  isDarkMode 
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-900/50' 
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  CORE MODULE
                </span>
              </div>
              <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-4 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-[#113C24] shadow-md shadow-emerald-900/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                  <PawPrint className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold transition-colors mb-0.5 ${
                    isDarkMode 
                      ? 'text-white group-hover:text-emerald-400' 
                      : 'text-slate-900 group-hover:text-[#113C24]'
                  }`}>
                    Animal Management
                  </h3>
                  <p className={`text-[11px] leading-relaxed font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Centralize wildlife profiles, species taxonomies, daily logs, and official reports.
                  </p>
                </div>
                <div className={`pt-2 border-t mt-2 flex items-center justify-between font-bold text-[10px] ${
                  isDarkMode 
                    ? 'border-emerald-950/60 text-emerald-400' 
                    : 'border-slate-100 text-[#113C24]'
                }`}>
                  <span className="group-hover:underline">Explore module</span>
                  <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Enclosure Management */}
            <div className={`group rounded-xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full transform hover:-translate-y-0.5 ${
              isDarkMode 
                ? 'bg-[#092618]/60 border-emerald-950 hover:border-amber-500/45' 
                : 'bg-white border-slate-200/90 hover:border-amber-500/30'
            }`}>
              <div className="relative h-16 sm:h-20 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600"
                  alt="Natural Habitat"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className={`absolute top-1.5 right-2 px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase rounded-full border shadow-xs ${
                  isDarkMode 
                    ? 'bg-amber-950 text-amber-400 border-amber-900/50' 
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  HABITAT MONITORING
                </span>
              </div>
              <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-4 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 shadow-md shadow-amber-950/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                  <Home className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold transition-colors mb-0.5 ${
                    isDarkMode 
                      ? 'text-white group-hover:text-amber-400' 
                      : 'text-slate-900 group-hover:text-amber-800'
                  }`}>
                    Enclosure & Spaces
                  </h3>
                  <p className={`text-[11px] leading-relaxed font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Monitor temperature, environments, cleanliness, capacity, and facility maintenance.
                  </p>
                </div>
                <div className={`pt-2 border-t mt-2 flex items-center justify-between font-bold text-[10px] ${
                  isDarkMode 
                    ? 'border-emerald-950/60 text-amber-400' 
                    : 'border-slate-100 text-amber-800'
                }`}>
                  <span className="group-hover:underline">Explore module</span>
                  <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Veterinary Records */}
            <div className={`group rounded-xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full transform hover:-translate-y-0.5 ${
              isDarkMode 
                ? 'bg-[#092618]/60 border-emerald-950 hover:border-teal-500/45' 
                : 'bg-white border-slate-200/90 hover:border-teal-500/30'
            }`}>
              <div className="relative h-16 sm:h-20 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600"
                  alt="Medical Care"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className={`absolute top-1.5 right-2 px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase rounded-full border shadow-xs ${
                  isDarkMode 
                    ? 'bg-teal-950 text-teal-400 border-teal-900/50' 
                    : 'bg-teal-100 text-teal-900 border-teal-300'
                }`}>
                  CLINICAL SUITE
                </span>
              </div>
              <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-4 w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 shadow-md shadow-teal-950/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold transition-colors mb-0.5 ${
                    isDarkMode 
                      ? 'text-white group-hover:text-teal-400' 
                      : 'text-slate-900 group-hover:text-teal-850'
                  }`}>
                    Veterinary & Health
                  </h3>
                  <p className={`text-[11px] leading-relaxed font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Manage prescriptions, clinical diagnoses, diets, and vaccination schedules.
                  </p>
                </div>
                <div className={`pt-2 border-t mt-2 flex items-center justify-between font-bold text-[10px] ${
                  isDarkMode 
                    ? 'border-emerald-950/60 text-teal-400' 
                    : 'border-slate-100 text-teal-800'
                }`}>
                  <span className="group-hover:underline">Explore module</span>
                  <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Breeding Management */}
            <div className={`group rounded-xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full transform hover:-translate-y-0.5 ${
              isDarkMode 
                ? 'bg-[#092618]/60 border-emerald-950 hover:border-purple-500/45' 
                : 'bg-white border-slate-200/90 hover:border-purple-500/30'
            }`}>
              <div className="relative h-16 sm:h-20 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600"
                  alt="Breeding and Incubation"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className={`absolute top-1.5 right-2 px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase rounded-full border shadow-xs ${
                  isDarkMode 
                    ? 'bg-purple-950 text-purple-400 border-purple-900/50' 
                    : 'bg-purple-100 text-purple-900 border-purple-300'
                }`}>
                  GENETIC & BREEDING
                </span>
              </div>
              <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-4 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-md shadow-purple-950/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                  <Dna className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold transition-colors mb-0.5 ${
                    isDarkMode 
                      ? 'text-white group-hover:text-purple-400' 
                      : 'text-slate-900 group-hover:text-purple-800'
                  }`}>
                    Breeding & Lineage
                  </h3>
                  <p className={`text-[11px] leading-relaxed font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Track incubation, egg weight, compatibility, pedigree, and success metrics.
                  </p>
                </div>
                <div className={`pt-2 border-t mt-2 flex items-center justify-between font-bold text-[10px] ${
                  isDarkMode 
                    ? 'border-emerald-950/60 text-purple-400' 
                    : 'border-slate-100 text-purple-800'
                }`}>
                  <span className="group-hover:underline">Explore module</span>
                  <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Inventory & Resources */}
            <div className={`group rounded-xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full transform hover:-translate-y-0.5 ${
              isDarkMode 
                ? 'bg-[#092618]/60 border-emerald-950 hover:border-rose-500/45' 
                : 'bg-white border-slate-200/90 hover:border-rose-500/30'
            }`}>
              <div className="relative h-16 sm:h-20 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"
                  alt="Inventory Supplies"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className={`absolute top-1.5 right-2 px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase rounded-full border shadow-xs ${
                  isDarkMode 
                    ? 'bg-rose-950 text-rose-400 border-rose-900/50' 
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}>
                  SUPPLY CHAIN
                </span>
              </div>
              <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-4 w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 shadow-md shadow-rose-950/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                  <Box className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold transition-colors mb-0.5 ${
                    isDarkMode 
                      ? 'text-white group-hover:text-rose-400' 
                      : 'text-slate-900 group-hover:text-rose-800'
                  }`}>
                    Inventory & Feed
                  </h3>
                  <p className={`text-[11px] leading-relaxed font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Monitor feed stocks, veterinary medicines, supplies, and low-stock alerts.
                  </p>
                </div>
                <div className={`pt-2 border-t mt-2 flex items-center justify-between font-bold text-[10px] ${
                  isDarkMode 
                    ? 'border-emerald-950/60 text-rose-400' 
                    : 'border-slate-100 text-rose-800'
                }`}>
                  <span className="group-hover:underline">Explore module</span>
                  <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Reports & Analytics */}
            <div className={`group rounded-xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full transform hover:-translate-y-0.5 ${
              isDarkMode 
                ? 'bg-[#092618]/60 border-emerald-950 hover:border-blue-500/45' 
                : 'bg-white border-slate-200/90 hover:border-blue-500/30'
            }`}>
              <div className="relative h-16 sm:h-20 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600"
                  alt="Data Dashboard"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className={`absolute top-1.5 right-2 px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase rounded-full border shadow-xs ${
                  isDarkMode 
                    ? 'bg-blue-950 text-blue-400 border-blue-900/50' 
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}>
                  DECISION INTELLIGENCE
                </span>
              </div>
              <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-4 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-950/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold transition-colors mb-0.5 ${
                    isDarkMode 
                      ? 'text-white group-hover:text-blue-400' 
                      : 'text-slate-900 group-hover:text-blue-800'
                  }`}>
                    Reports & Analytics
                  </h3>
                  <p className={`text-[11px] leading-relaxed font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Instantly generate government-compliant reports, feeding stats, and census graphs.
                  </p>
                </div>
                <div className={`pt-2 border-t mt-2 flex items-center justify-between font-bold text-[10px] ${
                  isDarkMode 
                    ? 'border-emerald-950/60 text-blue-400' 
                    : 'border-slate-100 text-blue-800'
                }`}>
                  <span className="group-hover:underline">Explore module</span>
                  <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-5 sm:mt-6">
            <button
              onClick={onLoginClick}
              className={`px-7 py-2.5 font-bold text-xs rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer inline-flex items-center space-x-2 ${
                isDarkMode 
                  ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-950/40 text-white' 
                  : 'bg-gradient-to-r from-[#113C24] to-[#1B5234] text-white hover:shadow-lg'
              }`}
            >
              <span>See All System Modules</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* About Us Support Section - Structured to fit within one frame */}
      <section id="about" className={`min-h-[calc(100vh-72px)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 transition-colors duration-300 relative overflow-hidden scroll-mt-[72px] ${
        isDarkMode ? 'bg-[#031309]' : 'bg-[#F4F7F5]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Left Column Content */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-5">
              <span className={`text-[10px] font-extrabold tracking-widest uppercase flex items-center space-x-1.5 transition-colors duration-300 ${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}`}>
                <span>🍃</span>
                <span>ABOUT US</span>
                <span>🍃</span>
              </span>
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Built to support wildlife care and daily operations
              </h2>
              <p className={`leading-relaxed text-xs sm:text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                FERONIA was designed for wildlife facilities of all sizes. From animal management to daily tasks and reporting, everything is organized in one easy-to-use system.
              </p>
              <ul className="space-y-2.5 pt-1">
                <li className="flex items-start space-x-2.5">
                  <span className={`${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'} font-bold text-base leading-none`}>✓</span>
                  <span className={`font-bold text-xs sm:text-sm transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Easy to use for every team member</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className={`${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'} font-bold text-base leading-none`}>✓</span>
                  <span className={`font-bold text-xs sm:text-sm transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Secure and reliable data management</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className={`${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'} font-bold text-base leading-none`}>✓</span>
                  <span className={`font-bold text-xs sm:text-sm transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Accessible anytime, anywhere</span>
                </li>
              </ul>
              <div className="pt-2">
                <button
                  onClick={onLoginClick}
                  className={`px-7 py-3 font-bold text-xs rounded-full transition-all cursor-pointer inline-flex items-center space-x-2 shadow-sm ${
                    isDarkMode 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                      : 'bg-[#113C24] hover:bg-[#1B5234] text-white'
                  }`}
                >
                  <span>Learn More About Us</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column Grid Layout of Images and Mission */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4 items-stretch">
              <div className="col-span-2 sm:col-span-6 flex flex-col gap-3">
                <div className={`aspect-[4/3] rounded-xl overflow-hidden border-2 shadow-xs transition-colors duration-300 ${isDarkMode ? 'border-emerald-900/40' : 'border-white'}`}>
                  <img
                    src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=600"
                    alt="Veterinary keeper examining wildlife"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className={`p-3.5 rounded-xl border flex items-start space-x-3 shadow-2xs transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-[#062414] border-emerald-900/40 text-emerald-100' 
                    : 'bg-[#EBF2EE] text-[#113C24] border-white shadow-emerald-950/5'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/35' : 'bg-white text-[#113C24]'}`}>
                    <PawPrint className="w-4 h-4" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-extrabold text-[11px] uppercase tracking-wider mb-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}`}>Our Mission</h4>
                    <p className={`text-[10px] leading-relaxed font-bold ${isDarkMode ? 'text-slate-200' : 'text-[#113C24]/90'}`}>
                      To simplify wildlife facility management and improve animal care through technology and organization.
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-6 flex flex-col gap-3">
                <div className={`aspect-[4/3] rounded-xl overflow-hidden border-2 shadow-xs transition-colors duration-300 ${isDarkMode ? 'border-emerald-900/40' : 'border-white'}`}>
                  <img
                    src="https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&q=80&w=600"
                    alt="Hands holding tortoise"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className={`aspect-[4/3] rounded-xl overflow-hidden border-2 shadow-xs transition-colors duration-300 ${isDarkMode ? 'border-emerald-900/40' : 'border-white'}`}>
                  <img
                    src="https://images.unsplash.com/photo-1504450874802-0ba2bcd9b5ae?auto=format&fit=crop&q=80&w=600"
                    alt="Bearded dragon on log"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Overview Section - Contained and fits gracefully in one frame */}
      <section id="overview" className={`min-h-[calc(100vh-72px)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 transition-colors duration-300 relative overflow-hidden scroll-mt-[72px] ${
        isDarkMode 
          ? 'bg-gradient-to-b from-[#031309] via-[#092918] to-[#05160E]' 
          : 'bg-gradient-to-b from-[#F4F7F5] via-[#D5E5DC] to-white'
      }`}>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-emerald-300/40 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
          <div className="text-center max-w-3xl mx-auto mb-4 sm:mb-6 space-y-1.5">
            <span className={`text-[10px] font-extrabold tracking-widest uppercase flex items-center justify-center space-x-1.5 px-3 py-0.5 rounded-full w-max mx-auto border transition-colors duration-300 ${
              isDarkMode 
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/50' 
                : 'text-[#113C24] bg-emerald-100/60 border-emerald-200/50'
            }`}>
              <span>🍃</span>
              <span>SYSTEM OVERVIEW</span>
              <span>🍃</span>
            </span>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              All your facility operations in one system
            </h2>
            <p className={`font-semibold text-xs max-w-xl mx-auto transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              FERONIA connects your data, teams, and daily tasks in a seamless workflow.
            </p>
          </div>

          <div className={`backdrop-blur-2xl rounded-2xl p-5 sm:p-6 lg:p-7 border shadow-xl transition-all duration-300 space-y-6 relative overflow-hidden ${
            isDarkMode 
              ? 'bg-[#092417]/45 border-emerald-900/40 shadow-black/30' 
              : 'bg-white/45 border-white/70 shadow-emerald-950/10'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/30 pointer-events-none" />
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">
              
              {/* Step 1 */}
              <div className={`flex flex-col items-center text-center relative group backdrop-blur-md p-3.5 sm:p-4 rounded-xl border hover:-translate-y-1 transition-all duration-300 shadow-xs hover:shadow-md ${
                isDarkMode 
                  ? 'bg-[#092215]/60 hover:bg-[#0c311e]/85 border-emerald-950 hover:border-emerald-500/40' 
                  : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-emerald-400'
              }`}>
                <span className="absolute top-2.5 right-2.5 text-[10px] font-black text-amber-700/50 tracking-wider">01</span>
                <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-white rounded-full flex items-center justify-center text-amber-800 shadow-xs mb-2.5 border border-amber-200 transition-transform duration-300 group-hover:scale-110">
                  <Pencil className="w-4 h-4 text-amber-800" />
                </div>
                <h4 className={`font-extrabold text-[11px] mb-1 uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>1. Add Records</h4>
                <p className={`text-[10px] leading-relaxed font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Add animals, enclosures, resources, and staff information.
                </p>
                <div className={`hidden lg:block absolute top-9 left-[calc(50%+1.8rem)] w-[calc(100%-3.6rem)] border-t-2 border-dashed ${isDarkMode ? 'border-emerald-500/10' : 'border-emerald-800/20'}`} />
              </div>

              {/* Step 2 */}
              <div className={`flex flex-col items-center text-center relative group backdrop-blur-md p-3.5 sm:p-4 rounded-xl border hover:-translate-y-1 transition-all duration-300 shadow-xs hover:shadow-md ${
                isDarkMode 
                  ? 'bg-[#092215]/60 hover:bg-[#0c311e]/85 border-emerald-950 hover:border-emerald-500/40' 
                  : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-emerald-400'
              }`}>
                <span className="absolute top-2.5 right-2.5 text-[10px] font-black text-blue-700/50 tracking-wider">02</span>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-white rounded-full flex items-center justify-center text-blue-800 shadow-xs mb-2.5 border border-blue-200 transition-transform duration-300 group-hover:scale-110">
                  <Clipboard className="w-4 h-4 text-blue-800" />
                </div>
                <h4 className={`font-extrabold text-[11px] mb-1 uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>2. Plan & Schedule</h4>
                <p className={`text-[10px] leading-relaxed font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Set tasks, feeding, cleaning, and medical schedules.
                </p>
                <div className={`hidden lg:block absolute top-9 left-[calc(50%+1.8rem)] w-[calc(100%-3.6rem)] border-t-2 border-dashed ${isDarkMode ? 'border-emerald-500/10' : 'border-emerald-800/20'}`} />
              </div>

              {/* Step 3 */}
              <div className={`flex flex-col items-center text-center relative group backdrop-blur-md p-3.5 sm:p-4 rounded-xl border hover:-translate-y-1 transition-all duration-300 shadow-xs hover:shadow-md ${
                isDarkMode 
                  ? 'bg-[#092215]/60 hover:bg-[#0c311e]/85 border-emerald-950 hover:border-emerald-500/40' 
                  : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-emerald-400'
              }`}>
                <span className="absolute top-2.5 right-2.5 text-[10px] font-black text-emerald-700/50 tracking-wider">03</span>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-white rounded-full flex items-center justify-center text-emerald-700 shadow-xs mb-2.5 border border-emerald-200 transition-transform duration-300 group-hover:scale-110">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                </div>
                <h4 className={`font-extrabold text-[11px] mb-1 uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>3. Daily Ops</h4>
                <p className={`text-[10px] leading-relaxed font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Keepers and vets complete tasks and log records.
                </p>
                <div className={`hidden lg:block absolute top-9 left-[calc(50%+1.8rem)] w-[calc(100%-3.6rem)] border-t-2 border-dashed ${isDarkMode ? 'border-emerald-500/10' : 'border-emerald-800/20'}`} />
              </div>

              {/* Step 4 */}
              <div className={`flex flex-col items-center text-center relative group backdrop-blur-md p-3.5 sm:p-4 rounded-xl border hover:-translate-y-1 transition-all duration-300 shadow-xs hover:shadow-md ${
                isDarkMode 
                  ? 'bg-[#092215]/60 hover:bg-[#0c311e]/85 border-emerald-950 hover:border-emerald-500/40' 
                  : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-emerald-400'
              }`}>
                <span className="absolute top-2.5 right-2.5 text-[10px] font-black text-indigo-700/50 tracking-wider">04</span>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-white rounded-full flex items-center justify-center text-indigo-800 shadow-xs mb-2.5 border border-indigo-200 transition-transform duration-300 group-hover:scale-110">
                  <BarChart3 className="w-4 h-4 text-indigo-800" />
                </div>
                <h4 className={`font-extrabold text-[11px] mb-1 uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>4. Monitor</h4>
                <p className={`text-[10px] leading-relaxed font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Monitor health, inventory, and facility status in real-time.
                </p>
                <div className={`hidden lg:block absolute top-9 left-[calc(50%+1.8rem)] w-[calc(100%-3.6rem)] border-t-2 border-dashed ${isDarkMode ? 'border-emerald-500/10' : 'border-emerald-800/20'}`} />
              </div>

              {/* Step 5 */}
              <div className={`flex flex-col items-center text-center relative group backdrop-blur-md p-3.5 sm:p-4 rounded-xl border hover:-translate-y-1 transition-all duration-300 shadow-xs hover:shadow-md ${
                isDarkMode 
                  ? 'bg-[#092215]/60 hover:bg-[#0c311e]/85 border-emerald-950 hover:border-emerald-500/40' 
                  : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-emerald-400'
              }`}>
                <span className="absolute top-2.5 right-2.5 text-[10px] font-black text-rose-700/50 tracking-wider">05</span>
                <div className="w-10 h-10 bg-gradient-to-br from-rose-50 to-white rounded-full flex items-center justify-center text-rose-800 shadow-xs mb-2.5 border border-rose-200 transition-transform duration-300 group-hover:scale-110">
                  <Clipboard className="w-4 h-4 text-rose-800" />
                </div>
                <h4 className={`font-extrabold text-[11px] mb-1 uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>5. Reports</h4>
                <p className={`text-[10px] leading-relaxed font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Create reports easily for management and record keeping.
                </p>
                <div className={`hidden lg:block absolute top-9 left-[calc(50%+1.8rem)] w-[calc(100%-3.6rem)] border-t-2 border-dashed ${isDarkMode ? 'border-emerald-500/10' : 'border-emerald-800/20'}`} />
              </div>

              {/* Step 6 */}
              <div className={`flex flex-col items-center text-center relative group backdrop-blur-md p-3.5 sm:p-4 rounded-xl border hover:-translate-y-1 transition-all duration-300 shadow-xs hover:shadow-md ${
                isDarkMode 
                  ? 'bg-[#092215]/60 hover:bg-[#0c311e]/85 border-emerald-950 hover:border-emerald-500/40' 
                  : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-emerald-400'
              }`}>
                <span className="absolute top-2.5 right-2.5 text-[10px] font-black text-teal-700/50 tracking-wider">06</span>
                <div className="w-10 h-10 bg-gradient-to-br from-teal-50 to-white rounded-full flex items-center justify-center text-teal-700 shadow-xs mb-2.5 border border-teal-200 transition-transform duration-300 group-hover:scale-110">
                  <TrendingUp className="w-4 h-4 text-teal-700" />
                </div>
                <h4 className={`font-extrabold text-[11px] mb-1 uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>6. Decide</h4>
                <p className={`text-[10px] leading-relaxed font-bold transition-colors duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Use accurate data and insights to make better decisions.
                </p>
              </div>

            </div>

            <div className="text-center relative z-10 pt-1">
              <button
                onClick={onLoginClick}
                className={`px-7 py-2.5 font-bold text-xs rounded-full transition-all inline-flex items-center space-x-2 cursor-pointer shadow-sm ${
                  isDarkMode 
                    ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-950/40 text-white' 
                    : 'bg-gradient-to-r from-[#113C24] to-[#1B5234] hover:shadow-lg text-white'
                }`}
              >
                <span>View All Modules</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Contact Section + Integrated Footer - Structured to fit within a single frame */}
      <section id="contact" className={`min-h-[calc(100vh-72px)] flex flex-col justify-between pt-6 sm:pt-8 pb-3 transition-colors duration-300 relative overflow-hidden scroll-mt-[72px] ${
        isDarkMode ? 'bg-[#04160E]' : 'bg-[#F9FBFA]'
      }`}>
        {/* Subtle decorative nature watermark on the top right */}
        <div className="absolute top-0 right-0 w-[42%] h-[65%] pointer-events-none select-none z-0 hidden lg:block overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200"
            alt="Green leaves decoration"
            className="w-full h-full object-cover object-left opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className={`absolute inset-0 bg-gradient-to-l transition-colors duration-300 ${
            isDarkMode ? 'from-transparent via-[#04160E]/70 to-[#04160E]' : 'from-transparent via-[#F9FBFA]/80 to-[#F9FBFA]'
          }`} />
          <div className={`absolute inset-0 bg-gradient-to-t transition-colors duration-300 ${
            isDarkMode ? 'from-[#04160E] to-transparent' : 'from-[#F9FBFA] to-transparent'
          }`} />
        </div>

        {/* Contact Content (Upper Area of Frame) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto py-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left Col: Contact heading & callout */}
            <div className="lg:col-span-7 space-y-3">
              <div className={`inline-flex items-center space-x-1.5 text-[10px] font-extrabold tracking-widest uppercase px-3 py-0.5 rounded-full border transition-colors duration-300 ${
                isDarkMode 
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/50' 
                  : 'text-[#113C24] bg-emerald-50 border-emerald-100'
              }`}>
                <span>CONTACT US</span>
                <span>🌿</span>
              </div>
              
              <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                We're here to help elevate your facility
              </h2>
              
              <p className={`font-semibold text-xs sm:text-sm max-w-xl leading-relaxed transition-colors duration-300 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-800'
              }`}>
                Have questions or want to collaborate? Reach out to our wildlife team or request a personalized walkthrough.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                {/* Phone */}
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' : 'bg-emerald-100 text-[#113C24]'}`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Phone</span>
                    <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>+63 928 054 3536</span>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' : 'bg-emerald-100 text-[#113C24]'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Email</span>
                    <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>info@feronia.com</span>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-rose-950/60 text-rose-400 border border-rose-900/40' : 'bg-rose-100 text-rose-700'}`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Location</span>
                    <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Philippines</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Quick Collaboration Box */}
            <div className="lg:col-span-5">
              <div className={`p-4 sm:p-5 rounded-2xl border shadow-md transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-[#062414]/80 border-emerald-900/50 backdrop-blur-md' 
                  : 'bg-white border-slate-200/90 shadow-emerald-950/5'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <PawPrint className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}`} fill="currentColor" />
                  <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Partner With FERONIA
                  </h4>
                </div>
                <p className={`text-[11px] font-semibold leading-relaxed mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  Join wildlife sanctuaries, rescue centers, and conservation facilities worldwide leveraging FERONIA for seamless daily care.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCollabForm({
                        name: '',
                        email: '',
                        organization: '',
                        type: 'Partnership',
                        message: ''
                      });
                      setIsCollabSubmitted(false);
                      setShowCollabModal(true);
                    }}
                    className={`flex-1 px-5 py-2.5 font-bold text-xs rounded-full shadow-xs hover:shadow-md transition-all inline-flex items-center justify-center space-x-2 cursor-pointer ${
                      isDarkMode 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                        : 'bg-[#113C24] hover:bg-[#1B5234] text-white'
                    }`}
                  >
                    <span>Request Collaboration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onLoginClick}
                    className={`px-4 py-2.5 font-bold text-xs rounded-full transition-all border cursor-pointer ${
                      isDarkMode
                        ? 'border-emerald-800 text-emerald-300 hover:bg-emerald-950/50'
                        : 'border-slate-300 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Log In
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Integrated Footer (Bottom Area of Frame) */}
        <footer className="w-full bg-[#05140C] text-emerald-100 pt-4 pb-3 sm:pb-4 px-4 sm:px-6 lg:px-8 border-t border-emerald-950/60 shrink-0">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start text-xs">
              
              {/* Col 1: Brand */}
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <div className="flex items-center space-x-2 text-white">
                  <PawPrint className="w-5 h-5 text-emerald-400" fill="currentColor" />
                  <span className="font-extrabold text-base tracking-tight">FERONIA</span>
                </div>
                <p className="text-[8px] text-emerald-300 font-bold tracking-wider uppercase leading-tight">
                  WILDLIFE FACILITY MANAGEMENT
                </p>
                <div className="flex space-x-2 pt-1">
                  <span className="w-6 h-6 rounded-full border border-emerald-800/40 bg-white/5 flex items-center justify-center hover:bg-emerald-950 transition-colors cursor-pointer text-emerald-300">
                    <Facebook className="w-3 h-3" />
                  </span>
                  <span className="w-6 h-6 rounded-full border border-emerald-800/40 bg-white/5 flex items-center justify-center hover:bg-emerald-950 transition-colors cursor-pointer text-emerald-300">
                    <Instagram className="w-3 h-3" />
                  </span>
                  <span className="w-6 h-6 rounded-full border border-emerald-800/40 bg-white/5 flex items-center justify-center hover:bg-emerald-950 transition-colors cursor-pointer text-emerald-300">
                    <Youtube className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Col 2: Modules */}
              <div>
                <h4 className="text-white text-[11px] font-extrabold tracking-wider uppercase mb-1.5">Modules</h4>
                <ul className="space-y-1 text-[10px] text-emerald-200/80 font-medium">
                  <li>Animal & Medical Care</li>
                  <li>Enclosure & Habitat</li>
                  <li>Breeding & Incubation</li>
                  <li>Inventory & Reports</li>
                </ul>
              </div>

              {/* Col 3: Support */}
              <div>
                <h4 className="text-white text-[11px] font-extrabold tracking-wider uppercase mb-1.5">Support</h4>
                <ul className="space-y-1 text-[10px] text-emerald-200/80 font-medium">
                  <li>Help Center & Docs</li>
                  <li>User Guides</li>
                  <li>Privacy Policy</li>
                  <li>Terms of Service</li>
                </ul>
              </div>

              {/* Col 4: Newsletter */}
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <h4 className="text-white text-[11px] font-extrabold tracking-wider uppercase mb-1">Stay Updated</h4>
                {isSubscribed ? (
                  <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-200 text-[10px] px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-semibold truncate">Subscribed: {subscribedEmail}</span>
                  </div>
                ) : (
                  <form 
                    className="flex gap-1.5 w-full" 
                    onSubmit={(e) => { 
                      e.preventDefault(); 
                      setIsSubscribed(true); 
                    }}
                  >
                    <input
                      type="email"
                      placeholder="Your email"
                      value={subscribedEmail}
                      onChange={(e) => setSubscribedEmail(e.target.value)}
                      className="px-3 py-1.5 bg-white text-slate-800 text-[10px] rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 min-w-0 placeholder-slate-400 font-medium"
                      required
                    />
                    <button 
                      type="submit" 
                      className="px-3.5 py-1.5 bg-[#1B5234] hover:bg-[#236842] text-white text-[10px] font-bold rounded-full transition-colors cursor-pointer shrink-0"
                    >
                      Join
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="border-t border-emerald-950/80 pt-2 flex items-center justify-between text-[9px] text-emerald-200/50 font-medium">
              <p>© 2026 FERONIA Wildlife Facility Management System.</p>
              <p>All rights reserved.</p>
            </div>
          </div>
        </footer>
      </section>

      {/* Video Demo Modal & Collaboration Request Modal Overlay */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className={`relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border shadow-2xl ${
                isDarkMode ? 'border-emerald-500/30 bg-neutral-950' : 'border-white/20 bg-neutral-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white hover:text-emerald-400 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/9No-FiEInLA?autoplay=1"
                title="FERONIA Wildlife Demo Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}

        {showCollabModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
            onClick={() => setShowCollabModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`relative w-full max-w-lg rounded-3xl p-6 md:p-8 border shadow-2xl transition-all ${
                isDarkMode 
                  ? 'border-emerald-900/60 bg-[#06180F] text-white shadow-black/50' 
                  : 'border-white bg-white text-slate-800 shadow-emerald-950/10'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCollabModal(false)}
                className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-emerald-950/60 border-emerald-900/60 hover:bg-emerald-900 text-emerald-400' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'
                }`}
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              {!isCollabSubmitted ? (
                <form onSubmit={handleCollabSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <span className={`text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-0.5 rounded-full border inline-block ${
                      isDarkMode 
                        ? 'text-emerald-400 bg-emerald-950/50 border-emerald-900/40' 
                        : 'text-[#113C24] bg-emerald-50 border-emerald-100/60'
                    }`}>
                      🤝 Partner with FERONIA
                    </span>
                    <h3 className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                      Request Collaboration
                    </h3>
                    <p className={`text-[11px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                      Connect your wildlife organization, research lab, or conservation group with our team to start working together.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className={`block text-[9px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-emerald-500/60' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          required
                          value={collabForm.name}
                          onChange={(e) => setCollabForm({ ...collabForm, name: e.target.value })}
                          placeholder="Juan Dela Cruz"
                          className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium ${
                            isDarkMode 
                              ? 'bg-[#092216] border-emerald-950 text-white placeholder-slate-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className={`block text-[9px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-emerald-500/60' : 'text-slate-400'}`} />
                        <input
                          type="email"
                          required
                          value={collabForm.email}
                          onChange={(e) => setCollabForm({ ...collabForm, email: e.target.value })}
                          placeholder="juan@organization.org"
                          className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium ${
                            isDarkMode 
                              ? 'bg-[#092216] border-emerald-950 text-white placeholder-slate-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className={`block text-[9px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Organization / Facility <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-emerald-500/60' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          required
                          value={collabForm.organization}
                          onChange={(e) => setCollabForm({ ...collabForm, organization: e.target.value })}
                          placeholder="Wildlife Conservation Philippines"
                          className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium ${
                            isDarkMode 
                              ? 'bg-[#092216] border-emerald-950 text-white placeholder-slate-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className={`block text-[9px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Type of Collaboration <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={collabForm.type}
                        onChange={(e) => setCollabForm({ ...collabForm, type: e.target.value })}
                        className={`w-full px-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold ${
                          isDarkMode 
                            ? 'bg-[#092216] border-emerald-950 text-white' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="Partnership">Wildlife Care & Conservation Partnership</option>
                        <option value="Research">Academic & Scientific Research</option>
                        <option value="Funding">Sponsorship / Funding Support</option>
                        <option value="Volunteering">Volunteer Program Coordination</option>
                        <option value="Other">Other Initiatives</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={`block text-[9px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Brief Description / Proposal <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MessageSquare className={`absolute left-3.5 top-3 w-4 h-4 ${isDarkMode ? 'text-emerald-500/60' : 'text-slate-400'}`} />
                        <textarea
                          required
                          rows={3}
                          value={collabForm.message}
                          onChange={(e) => setCollabForm({ ...collabForm, message: e.target.value })}
                          placeholder="Tell us about your proposal, goals, and how you'd like to work together..."
                          className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium ${
                            isDarkMode 
                              ? 'bg-[#092216] border-emerald-950 text-white placeholder-slate-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCollabModal(false)}
                      className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                        isDarkMode 
                          ? 'border-emerald-950 text-slate-300 hover:bg-emerald-950/40' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-3 text-xs font-bold text-white rounded-xl shadow-sm hover:shadow-md transition-all text-center cursor-pointer ${
                        isDarkMode 
                          ? 'bg-emerald-600 hover:bg-emerald-500' 
                          : 'bg-[#113C24] hover:bg-[#1B5234]'
                      }`}
                    >
                      Submit Proposal
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4 space-y-4 animate-fade-in">
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-xs">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className={`text-lg font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                      Proposal Submitted!
                    </h3>
                    <p className={`text-xs leading-relaxed font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Thank you, <span className="font-bold text-emerald-500">{collabForm.name}</span>. We've received your request. Our partnerships team will review the proposal and reach out to you at <span className="font-bold underline">{collabForm.email}</span>.
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border text-left space-y-2 max-w-sm mx-auto ${
                    isDarkMode 
                      ? 'bg-[#092216]/85 border-emerald-950 text-slate-200' 
                      : 'bg-emerald-50/50 border-emerald-100 text-slate-800'
                  }`}>
                    <div className="flex justify-between items-center text-[9px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                      <span>Request Summary</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Reference ID</span>
                    </div>
                    
                    <div className="flex justify-between items-center font-bold text-xs pt-1">
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Reference Code:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/60 text-[11px]">
                        {submittedRefId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold pt-1">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Organization:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{collabForm.organization}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Partnership Type:</span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 rounded-full text-[9px] font-extrabold uppercase">
                        {collabForm.type}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCollabModal(false)}
                      className={`px-8 py-3 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-emerald-950 border border-emerald-900 hover:bg-emerald-900 text-emerald-300' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
