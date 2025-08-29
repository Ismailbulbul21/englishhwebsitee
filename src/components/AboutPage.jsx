import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Star, Users, Target, MessageCircle, Globe, Award, Mail, MapPin, Clock, Linkedin, Twitter, Github, Instagram, Crown, Zap, Heart, Sparkles, BookOpen, GraduationCap, Flag } from 'lucide-react'
// Import team photos
import ismaanPhoto from '../assets/team/ismaan.jpg'
import proudPhoto from '../assets/team/proud.jpg'

export default function AboutPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeCard, setActiveCard] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const teamMembers = [
    {
      id: 1,
      name: "Ismail mohamed osman ",
      position: " Founder",
      photo: ismaanPhoto,
      bio: "CEO of HadalHub",
      email: "ismailbulbul381@gmail.com",
      social: {
        tiktok: "https://www.tiktok.com/@ismailbulbulenglish?_t=ZM-8zE5EACweyj&_r=1"
      }
    },
    {
      id: 2,
      name: "Najma sh. Abdihafiith nor",
      position: "Marketing ",
      photo: proudPhoto,
      bio: "Team Marketing Header ",
     
      social: {
        tiktok: "https://www.tiktok.com/@.queennajma?_t=ZM-8zE5A2SbraX&_r=1"
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black relative overflow-hidden">
      {/* Beautiful Falling Stars and Flying Books Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Somalia Flag - Far Right */}
        <div className="absolute top-20 right-8 opacity-20">
          <div className="w-32 h-20 bg-gradient-to-b from-blue-500 via-white to-green-500 rounded-lg shadow-2xl transform rotate-12">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Falling Stars */}
        <div className="absolute inset-0">
          {/* Star 1 */}
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-white rounded-full shadow-lg" style={{
            animation: 'fallingStar 8s linear infinite',
            animationDelay: '0s'
          }}></div>
          
          {/* Star 2 */}
          <div className="absolute top-0 right-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full shadow-lg" style={{
            animation: 'fallingStar 12s linear infinite',
            animationDelay: '2s'
          }}></div>
          
          {/* Star 3 */}
          <div className="absolute top-0 left-2/3 w-1 h-1 bg-cyan-300 rounded-full shadow-lg" style={{
            animation: 'fallingStar 10s linear infinite',
            animationDelay: '4s'
          }}></div>
          
          {/* Star 4 */}
          <div className="absolute top-0 right-1/4 w-2.5 h-2.5 bg-yellow-300 rounded-full shadow-lg" style={{
            animation: 'fallingStar 15s linear infinite',
            animationDelay: '1s'
          }}></div>
          
          {/* Star 5 */}
          <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-purple-300 rounded-full shadow-lg" style={{
            animation: 'fallingStar 9s linear infinite',
            animationDelay: '3s'
          }}></div>
          
          {/* Star 6 */}
          <div className="absolute top-0 right-2/3 w-1 h-1 bg-emerald-300 rounded-full shadow-lg" style={{
            animation: 'fallingStar 11s linear infinite',
            animationDelay: '5s'
          }}></div>
        </div>
        
        {/* Flying Books - Representing Studying */}
        <div className="absolute inset-0">
          {/* Book 1 - Flying from left to right */}
          <div className="absolute top-1/4 left-0 w-8 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-sm shadow-xl" style={{
            animation: 'flyBook 20s linear infinite',
            animationDelay: '0s'
          }}>
            <div className="w-full h-0.5 bg-white/40 mt-1.5"></div>
            <div className="w-full h-0.5 bg-white/30 mt-1"></div>
          </div>
          
          {/* Book 2 - Flying from right to left */}
          <div className="absolute top-1/3 right-0 w-6 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-sm shadow-xl" style={{
            animation: 'flyBookReverse 25s linear infinite',
            animationDelay: '3s'
          }}>
            <div className="w-full h-0.5 bg-white/40 mt-1"></div>
          </div>
          
          {/* Book 3 - Flying diagonally */}
          <div className="absolute top-1/2 left-0 w-7 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-sm shadow-xl" style={{
            animation: 'flyBookDiagonal 30s linear infinite',
            animationDelay: '6s'
          }}>
            <div className="w-full h-0.5 bg-white/40 mt-1.5"></div>
            <div className="w-full h-0.5 bg-white/30 mt-1"></div>
          </div>
          
          {/* Book 4 - Floating gently */}
          <div className="absolute top-2/3 right-1/4 w-5 h-7 bg-gradient-to-br from-purple-500 to-purple-700 rounded-sm shadow-xl" style={{
            animation: 'floatBook 18s ease-in-out infinite',
            animationDelay: '2s'
          }}>
            <div className="w-full h-0.5 bg-white/40 mt-1"></div>
          </div>
          
          {/* Book 5 - Spinning while flying */}
          <div className="absolute top-3/4 left-1/3 w-6 h-8 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-sm shadow-xl" style={{
            animation: 'spinFlyBook 35s linear infinite',
            animationDelay: '4s'
          }}>
            <div className="w-full h-0.5 bg-white/40 mt-1"></div>
          </div>
        </div>
        
        {/* Subtle Glowing Particles */}
        <div className="absolute top-1/6 left-1/6 w-1 h-1 bg-cyan-400/60 rounded-full animate-pulse" style={{animationDuration: '4s'}}></div>
        <div className="absolute top-2/3 right-1/6 w-1 h-1 bg-blue-400/50 rounded-full animate-pulse" style={{animationDuration: '6s'}}></div>
        <div className="absolute top-1/2 left-1/6 w-0.5 h-0.5 bg-purple-400/40 rounded-full animate-pulse" style={{animationDuration: '5s'}}></div>
        
        {/* Custom CSS Animations */}
        <style jsx>{`
          @keyframes fallingStar {
            0% { 
              transform: translateY(-10px) rotate(0deg); 
              opacity: 0; 
            }
            10% { 
              opacity: 1; 
            }
            90% { 
              opacity: 1; 
            }
            100% { 
              transform: translateY(calc(100vh + 10px)) rotate(360deg); 
              opacity: 0; 
            }
          }
          
          @keyframes flyBook {
            0% { 
              transform: translateX(-50px) translateY(0px) rotate(-15deg); 
              opacity: 0; 
            }
            10% { 
              opacity: 1; 
            }
            90% { 
              opacity: 1; 
            }
            100% { 
              transform: translateX(calc(100vw + 50px)) translateY(-100px) rotate(15deg); 
              opacity: 0; 
            }
          }
          
          @keyframes flyBookReverse {
            0% { 
              transform: translateX(calc(100vw + 50px)) translateY(0px) rotate(15deg); 
              opacity: 0; 
            }
            10% { 
              opacity: 1; 
            }
            90% { 
              opacity: 1; 
            }
            100% { 
              transform: translateX(-50px) translateY(100px) rotate(-15deg); 
              opacity: 0; 
            }
          }
          
          @keyframes flyBookDiagonal {
            0% { 
              transform: translate(-50px, -50px) rotate(-45deg); 
              opacity: 0; 
            }
            10% { 
              opacity: 1; 
            }
            90% { 
              opacity: 1; 
            }
            100% { 
              transform: translate(calc(100vw + 50px), calc(100vh + 50px)) rotate(45deg); 
              opacity: 0; 
            }
          }
          
          @keyframes floatBook {
            0%, 100% { 
              transform: translateY(0px) rotate(0deg); 
            }
            50% { 
              transform: translateY(-40px) rotate(5deg); 
            }
          }
          
          @keyframes spinFlyBook {
            0% { 
              transform: translateX(-50px) translateY(0px) rotate(0deg); 
              opacity: 0; 
            }
            10% { 
              opacity: 1; 
            }
            90% { 
              opacity: 1; 
            }
            100% { 
              transform: translateX(calc(100vw + 50px)) translateY(-150px) rotate(720deg); 
              opacity: 0; 
            }
          }
        `}</style>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center space-x-3 text-white/80 hover:text-white transition-all duration-300 group hover:scale-105"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-lg font-medium">Back to Dashboard</span>
            </Link>
            
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              HadalHub
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* Hero Section */}
        <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500/30 to-pink-500/30 rounded-2xl mb-6 backdrop-blur-sm border border-white/20">
            <Crown className="h-8 w-8 text-cyan-400" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Meet Our Team
          </h1>
          
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            The passionate visionaries behind HadalHub's mission to make English learning accessible for Somali speakers worldwide
          </p>
        </div>

        {/* Team Cards */}
        <div className={`mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className={`group transition-all duration-700 delay-${index * 200} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                onMouseEnter={() => setActiveCard(member.id)}
                onMouseLeave={() => setActiveCard(null)}
              >
                <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-white/20 rounded-3xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-500 group-hover:border-cyan-400/50 group-hover:from-slate-800/95 group-hover:to-slate-900/95">
                  
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/5 to-pink-500/5"></div>
                    <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400/30 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-pink-400/30 rounded-full animate-ping"></div>
                  </div>
                  
                  {/* Profile Photo */}
                  <div className="relative w-full h-64 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
                    <img 
                      src={member.photo} 
                      alt={`${member.name} - ${member.position}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center" style={{display: 'none'}}>
                      <Users className="h-20 w-20 text-white/40" />
                    </div>
                    
                    {/* Position Badge */}
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-200">
                      {member.position.split(' ')[0]}
                    </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="relative z-20 p-4">
                    {/* Name with Sparkle Effect */}
                    <div className="flex items-center justify-center mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors duration-300">
                        {member.name}
                      </h3>
                      <Sparkles className="h-4 w-4 text-yellow-400 ml-2 opacity-0 group-hover:opacity-100 group-hover:animate-spin transition-all duration-500 delay-300" />
                    </div>
                    
                    {/* Position */}
                    <p className="text-center text-cyan-400 font-semibold mb-2 text-base">{member.position}</p>
                    
                    {/* Bio */}
                    <p className="text-white/70 text-xs leading-relaxed text-center mb-3 line-clamp-2">
                      {member.bio}
                    </p>
                    
                    {/* Contact & Social */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2 text-white/60 hover:text-white/80 transition-colors group/email">
                        <Mail className="h-3 w-3 group-hover/email:animate-bounce" />
                        <span className="text-xs">{member.email}</span>
                      </div>
                      
                      {/* TikTok Icon */}
                      <div className="flex items-center justify-center pt-1">
                        {member.social.tiktok && (
                          <a
                            href={member.social.tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-black/30 hover:bg-black/60 rounded-xl text-white hover:text-gray-200 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 group/social"
                          >
                            <span className="text-sm font-bold">TikTok</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom Glow Effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission & Vision */}
        <div className={`mb-16 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Mission Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 hover:scale-105 hover:shadow-2xl transition-all duration-300 hover:border-emerald-400/50">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-2xl flex items-center justify-center mr-4">
                  <Target className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Our Mission</h3>
              </div>
              <p className="text-white/80 leading-relaxed">
                Break down language barriers for Somali speakers worldwide through innovative, accessible, and engaging English learning experiences.
              </p>
            </div>
            
            {/* Vision Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 hover:scale-105 hover:shadow-2xl transition-all duration-300 hover:border-purple-400/50">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-purple-600/30 rounded-2xl flex items-center justify-center mr-4">
                  <Globe className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Our Vision</h3>
              </div>
              <p className="text-white/80 leading-relaxed">
                A world where every Somali speaker can confidently communicate in English, unlocking new opportunities for education, career advancement, and global connection.
              </p>
            </div>
          </div>
        </div>

        {/* Company Story */}
        <div className={`mb-16 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 md:p-10 max-w-4xl mx-auto hover:scale-105 hover:shadow-2xl transition-all duration-300">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-white mb-4">Our Story</h3>
              <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-pink-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-white/80 leading-relaxed mb-4">
                HadalHub was born from a simple yet powerful realization: traditional language learning methods weren't meeting the unique needs of Somali speakers. Our founders, passionate about education and technology, set out to create something different.
              </p>
              
              <p className="text-white/80 leading-relaxed mb-4">
                What started as a small project has grown into a thriving community of over 5,700 learners worldwide. We've combined cutting-edge technology with human-centered design to create an experience that's not just educational, but genuinely engaging and effective.
              </p>
              
              <p className="text-white/80 leading-relaxed">
                Today, HadalHub stands as a testament to what's possible when innovation meets purpose. We're not just teaching English; we're building bridges between cultures, creating opportunities, and empowering a community to reach their full potential.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className={`transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Get In Touch
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Have questions? Want to collaborate? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Contact Information */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 hover:scale-105 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-2xl font-bold text-white mb-6">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-blue-600/30 rounded-2xl flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Email</p>
                    <p className="text-white/70">hadalhub25@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-2xl flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Location</p>
                    <p className="text-white/70">Mogadishu, Somalia</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-purple-600/30 rounded-2xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Support Hours</p>
                    <p className="text-white/70">24/7 Available</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 hover:scale-105 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-2xl font-bold text-white mb-6">Send us a Message</h3>
              
              <form className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500 focus:bg-white/15 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <input
                    type="email"
                    placeholder="Your Email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500 focus:bg-white/15 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:bg-white/15 transition-all duration-200">
                    <option value="" className="bg-slate-800">Select Subject</option>
                    <option value="general" className="bg-slate-800">General Inquiry</option>
                    <option value="support" className="bg-slate-800">Technical Support</option>
                    <option value="partnership" className="bg-slate-800">Partnership</option>
                    <option value="feedback" className="bg-slate-800">Feedback</option>
                  </select>
                </div>
                
                <div>
                  <textarea
                    rows="4"
                    placeholder="Your Message"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500 focus:bg-white/15 transition-all duration-200 resize-none"
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-pink-600 hover:from-cyan-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300">
              <div className="text-3xl font-bold text-cyan-400 mb-2">5,700+</div>
              <div className="text-white/70">Active Learners</div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300">
              <div className="text-3xl font-bold text-pink-400 mb-2">178</div>
              <div className="text-white/70">Interactive Lessons</div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/20 rounded-3xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300">
              <div className="text-3xl font-bold text-emerald-400 mb-2">24/7</div>
              <div className="text-white/70">Support Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
