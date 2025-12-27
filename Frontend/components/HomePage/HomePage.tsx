'use client'
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, 
  Fuel, 
  Leaf, 
  Ambulance, 
  Brain, 
  Zap, 
  ChevronRight,
  AlertCircle,
  Activity,
  Network,
  Gauge,
  Clock,
  Shield,
  TrendingDown,
  ArrowDown,
  User,
  LogIn,
  Sun,
  Moon,
  BarChart3
} from 'lucide-react';

const ProjectVeghaLanding = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const TrafficLightAnimation = () => (
    <div className="flex space-x-4 justify-center my-8">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-20 h-24 bg-black dark:bg-black rounded-lg flex flex-col items-center justify-around p-2 shadow-lg"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <div className="w-4 h-4 rounded-full bg-red-500 opacity-30" />
          <div className="w-4 h-4 rounded-full bg-yellow-500 opacity-30" />
          <motion.div 
            className="w-4 h-4 rounded-full bg-green-500"
            animate={{
              opacity: [0.3, 1, 0.3],
              boxShadow: ['0 0 0px #22c55e', '0 0 20px #22c55e', '0 0 0px #22c55e']
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity
            }}
          />
        </motion.div>
      ))}
    </div>
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen relative bg-gray-50 dark:bg-gray-900">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-screen mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Vegha</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              About Us
            </button>
            <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              Contact Us
            </button>
            {/* <button className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-all">
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
            <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl">
              <User className="w-4 h-4" />
              <span>Sign Up</span>
            </button> */}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/traffic-bg.mp4" type="video/mp4" />
        </video>
        
        {/* Gradient overlay matching dashboard theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-blue-900/30 to-gray-900/50 z-10"></div>

        {/* Hero Content */}
        <div className="relative z-20 text-center max-w-6xl mx-auto px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="inline-flex items-center space-x-3 bg-blue-600/20 backdrop-blur-md rounded-full px-8 py-3 border border-blue-400/30 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-3xl lg:text-4xl font-bold text-white">Vegha</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-7xl font-bold text-white mb-6 drop-shadow-4xl"
            {...fadeInUp}
          >
            Smart Signals for
            <br />
            <span className="bg-gradient-to-r from-white to-white bg-clip-text text-transparent">
              Smoother Journeys
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-white mb-12 max-w-3xl mx-auto font-medium leading-relaxed drop-shadow-lg"
            {...fadeInUp}
            transition={{ delay: 0.2 }}
          >
            AI-powered traffic management for smarter, greener, faster roads
          </motion.p>

          <motion.div {...fadeInUp} transition={{ delay: 0.4 }} className="mb-16">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Go to Dashboard</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          <motion.div
            className="flex items-center justify-center space-x-2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-white text-sm font-medium">Discover More</p>
            <ArrowDown className="w-5 h-5 text-white" />
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-screen mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              {"The Problem We're Solving"}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
             {"India's cities face unprecedented traffic challenges that demand intelligent solutions."}
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { 
                icon: AlertCircle, 
                title: "Traffic Crisis in India", 
                desc: "Cities like Kolkata, Bengaluru, and Pune rank among the world's most congested, with average delays of 34+ minutes per 10 km",
                color: "from-red-500 to-red-600"
              },
              { 
                icon: Clock, 
                title: "Inefficient Signal Systems", 
                desc: "Current fixed-timing signals contribute to 5-10% of total urban traffic delays",
                color: "from-yellow-500 to-yellow-600"
              },
              { 
                icon: Shield, 
                title: "Privacy & Communication Issues", 
                desc: "Traditional centralized systems raise data privacy concerns and require high communication bandwidth",
                color: "from-purple-500 to-purple-600"
              },
              { 
                icon: TrendingDown, 
                title: "Economic Impact", 
                desc: "Traffic congestion costs billions in lost productivity and fuel consumption annually",
                color: "from-blue-500 to-blue-600"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group p-6 rounded-xl bg-blue-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} text-white mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                >
                  <item.icon className="w-7 h-7" />
                </motion.div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-screen mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              The Solution – Project Vegha
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Intelligent, decentralized traffic management powered by AI and federated learning
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-12"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {/* Step 1 */}
            <motion.div
              variants={fadeInUp}
              className="text-center group"
            >
              <motion.div
                className="relative mb-8 mx-auto w-32 h-32 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Brain className="w-12 h-12 text-white z-10" />
                </div>
                <motion.div
                  className="absolute inset-0 border-2 border-yellow-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Each Intersection Gets a Brain
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Analyzes live traffic data using computer vision and adjusts signals dynamically with AI-powered decision making
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              variants={fadeInUp}
              className="text-center group"
            >
              <motion.div
                className="relative mb-8 mx-auto w-32 h-32 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                  <Network className="w-12 h-12 text-white z-10" />
                </div>
                <motion.div
                  className="absolute inset-0 border-2 border-blue-400 rounded-full border-dashed"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Federated Intelligence Network
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Intersections share intelligence through federated learning to build a city-wide master model while preserving privacy
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              variants={fadeInUp}
              className="text-center group"
            >
              <motion.div
                className="relative mb-8 mx-auto w-32 h-32 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <Activity className="w-12 h-12 text-white z-10" />
                </div>
                <motion.div
                  className="absolute inset-0 border-2 border-green-400 rounded-full"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.5, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Smooth, Coordinated Flow
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Reduces commute times, prevents gridlock, and prioritizes emergency vehicles through intelligent coordination
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Analogy Section */}
      <section className="py-24 px-6 bg-gray-900 dark:bg-black">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold dark:text-white mb-6">
              From Rigid Control to Coordinated Intelligence
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
              Watch how synchronized traffic lights transform chaotic intersections into harmonious flow
            </p>
          </motion.div>

          <TrafficLightAnimation />
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-screen mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Real Impact, Real Benefits
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Measurable improvements for cities, citizens, and the environment
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: Car, title: "Faster Commutes", desc: "Reduce travel time by up to 30%", color: "from-blue-500 to-blue-600" },
              { icon: Fuel, title: "Fuel Savings", desc: "Cut fuel consumption through optimized flow", color: "from-green-500 to-green-600" },
              { icon: Leaf, title: "Cleaner Air", desc: "Lower emissions with reduced idling time", color: "from-emerald-500 to-emerald-600" },
              { icon: Ambulance, title: "Emergency Routes", desc: "Priority lanes for emergency vehicles", color: "from-red-500 to-red-600" }
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group p-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-xl transition-all duration-300"
                whileHover={{ y: -10 }}
              >
                <motion.div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${item.color} text-white mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                >
                  <item.icon className="w-8 h-8" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-800 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Gauge className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Project Vegha</span>
            </div>
            <p className="text-gray-400 mb-6">
              Powered by AI & Federated Learning
            </p>
            <div className="flex justify-center space-x-8 mb-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 mx-auto rounded-full" />
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default ProjectVeghaLanding;