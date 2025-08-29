# 🖼️ Team Photos Setup Guide

## 📁 Photo Requirements

### **Image Specifications:**
- **Format**: JPG or PNG
- **Size**: 400x400 pixels (square)
- **Quality**: High resolution, professional headshots
- **Style**: Professional, well-lit, business attire

## 📂 File Structure

Place your team photos in this folder:
```
src/assets/team/
├── ceo-photo.jpg      ← CEO photo
├── cto-photo.jpg      ← CTO photo
└── cmo-photo.jpg      ← CMO photo
```

## 🔧 How to Add Photos

### **Step 1: Prepare Photos**
1. **Take or select** professional headshots
2. **Crop to square** (400x400 pixels)
3. **Optimize** for web (compress if needed)

### **Step 2: Add to Project**
1. **Copy photos** to `src/assets/team/` folder
2. **Rename** to match the filenames above
3. **Photos automatically** appear in the About page

### **Step 3: Update Team Data (Optional)**

If you want to customize team member information, edit `src/components/AboutPage.jsx`:

```javascript
const teamMembers = [
  {
    id: 1,
    name: "Your Name",           // ← Change this
    position: "Your Position",    // ← Change this
    photo: "/src/assets/team/ceo-photo.jpg",
    bio: "Your bio here...",     // ← Change this
    email: "your@email.com",     // ← Change this
    social: {
      linkedin: "your-linkedin", // ← Change this
      twitter: "your-twitter",   // ← Change this
      github: "your-github"      // ← Change this
    }
  }
  // ... update other team members
]
```

## 🎯 Current Team Setup

The About page is currently configured with:

### **CEO & Founder**
- **Name**: Ahmed Hassan
- **Position**: CEO & Founder
- **Bio**: Visionary leader with 10+ years in EdTech
- **Social**: LinkedIn, Twitter, GitHub

### **CTO & Lead Developer**
- **Name**: Fatima Ali
- **Position**: CTO & Lead Developer
- **Bio**: Tech innovator specializing in AI-powered language learning
- **Social**: LinkedIn, Twitter, GitHub

### **CMO & Growth Strategist**
- **Name**: Omar Mohamed
- **Position**: CMO & Growth Strategist
- **Bio**: Marketing expert focused on community building
- **Social**: LinkedIn, Twitter, Instagram

## 🚀 Ready to Use

Your About page is **100% functional** right now with:
- ✅ **Premium design** and animations
- ✅ **Team section** prominently displayed
- ✅ **Contact form** and information
- ✅ **Company story** and mission
- ✅ **Responsive layout** for all devices

Just add your team photos to see the complete experience!

