import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function FoundationSection({ playAudio, user }) {
  // Foundation Category Navigation
  const [activeCategory, setActiveCategory] = useState(null)
  
  // Safety check - only show for beginners
  if (!user || user.english_level !== 'beginner') {
    return null
  }
  
  // Essential Words state
  const [selectedWordCategory, setSelectedWordCategory] = useState(null)
  const [wordCategories, setWordCategories] = useState([])
  const [categoryWords, setCategoryWords] = useState([])
  const [wordsLoading, setWordsLoading] = useState(false)
  
  // Real-Life Scenarios state
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [scenarioConversations, setScenarioConversations] = useState([])
  const [currentScenarioLevel, setCurrentScenarioLevel] = useState(1)
  const [currentConversation, setCurrentConversation] = useState(null)
  const [scenariosLoading, setScenariosLoading] = useState(false)
  const [userScenarioProgress, setUserScenarioProgress] = useState({})
  
  // Foundation Practice Activities State
  const [currentPractice, setCurrentPractice] = useState(null)
  const [practiceLevel, setPracticeLevel] = useState(1)
  const [currentActivity, setCurrentActivity] = useState(null)
  const [userAnswers, setUserAnswers] = useState([])
  const [userProgress, setUserProgress] = useState({
    fill_blank: { highest_level: 1, completed_levels: [] },
    word_matching: { highest_level: 1, completed_levels: [] },
    listen_choose: { highest_level: 1, completed_levels: [] }
  })
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [levelScore, setLevelScore] = useState(0)
  
  // Word Matching specific state
  const [selectedWord, setSelectedWord] = useState(null)
  const [matchedPairs, setMatchedPairs] = useState([])
  const [shuffledEnglish, setShuffledEnglish] = useState([])
  const [shuffledSomali, setShuffledSomali] = useState([])
  
  // Listen & Choose specific state - stable shuffled options
  const [shuffledListenOptions, setShuffledListenOptions] = useState({})

  // Utility functions
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
  
  // Clear shuffled options when switching activities
  const clearShuffledOptions = () => {
    setShuffledListenOptions({})
    setShuffledEnglish([])
    setShuffledSomali([])
    setMatchedPairs([])
    setSelectedWord(null)
  }

  // Regenerate shuffled options when level changes
  useEffect(() => {
    if (currentPractice === 'listen_choose' && currentActivity?.content?.questions) {
      const optionsMap = {}
      currentActivity.content.questions.forEach((question, qIndex) => {
        optionsMap[qIndex] = shuffleArray([...question.options])
      })
      setShuffledListenOptions(optionsMap)
    }
  }, [practiceLevel, currentPractice, currentActivity])

  // Fetch user progress from database
  const fetchUserProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: progress, error } = await supabase
        .from('user_practice_progress')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const progressByType = {
        fill_blank: { highest_level: 1, completed_levels: [] },
        word_matching: { highest_level: 1, completed_levels: [] },
        listen_choose: { highest_level: 1, completed_levels: [] }
      }

      progress?.forEach(p => {
        if (!progressByType[p.activity_type]) return
        progressByType[p.activity_type].highest_level = Math.max(
          progressByType[p.activity_type].highest_level, 
          p.highest_level_unlocked
        )
        if (p.is_completed) {
          progressByType[p.activity_type].completed_levels.push(p.level)
        }
      })

      setUserProgress(progressByType)
    } catch (error) {
      console.error('Error fetching user progress:', error)
    }
  }

  // Fetch essential words categories
  const fetchWordCategories = async () => {
    try {
      setWordsLoading(true)
      const { data, error } = await supabase
        .from('essential_words')
        .select('category, difficulty_level')
        .eq('is_active', true)
        .order('category')

      if (error) {
        console.error('Error fetching word categories:', error)
        return
      }

      // Group by category and count words per difficulty
      const categoryMap = {}
      data.forEach(word => {
        if (!categoryMap[word.category]) {
          categoryMap[word.category] = {
            name: word.category,
            totalWords: 0,
            difficulties: { Easy: 0, Medium: 0, Hard: 0 }
          }
        }
        categoryMap[word.category].totalWords++
        categoryMap[word.category].difficulties[word.difficulty_level] = 
          (categoryMap[word.category].difficulties[word.difficulty_level] || 0) + 1
      })

      const categories = Object.values(categoryMap).sort((a, b) => b.totalWords - a.totalWords)
      setWordCategories(categories)
    } catch (error) {
      console.error('Error fetching word categories:', error)
    } finally {
      setWordsLoading(false)
    }
  }

  // Fetch words for a specific category
  const fetchCategoryWords = async (category) => {
    try {
      setWordsLoading(true)
      const { data, error } = await supabase
        .from('essential_words')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('frequency_rank')

      if (error) {
        console.error('Error fetching category words:', error)
        return
      }

      setCategoryWords(data || [])
    } catch (error) {
      console.error('Error fetching category words:', error)
    } finally {
      setWordsLoading(false)
    }
  }

  // Fetch practice activities from database
  const fetchActivities = async (activityType, level) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('practice_activities')
        .select('*')
        .eq('activity_type', activityType)
        .eq('level', level)
        .eq('is_active', true)
        .single()

      if (error) throw error

      setCurrentActivity(data)
      setUserAnswers([])
      setShowResults(false)
      setLevelScore(0)

      // Initialize activity-specific state
      if (activityType === 'word_matching' && data?.content?.pairs) {
        const pairs = data.content.pairs
        setShuffledEnglish(shuffleArray(pairs.map(p => p.english)))
        setShuffledSomali(shuffleArray(pairs.map(p => p.somali)))
        setMatchedPairs([])
        setSelectedWord(null)
      }
      
      // Initialize Listen & Choose shuffled options
      if (activityType === 'listen_choose' && data?.content?.questions) {
        const optionsMap = {}
        data.content.questions.forEach((question, qIndex) => {
          optionsMap[qIndex] = shuffleArray([...question.options])
        })
        setShuffledListenOptions(optionsMap)
      }

    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Real-Life Scenarios from database
  const fetchScenarios = async () => {
    try {
      setScenariosLoading(true)
      const { data, error } = await supabase
        .from('conversation_scenarios')
        .select('*')
        .eq('is_active', true)
        .order('order_index')

      if (error) {
        console.error('Error fetching scenarios:', error)
        return
      }

      setScenarios(data || [])
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    } finally {
      setScenariosLoading(false)
    }
  }

  // Fetch scenario conversations for a specific scenario
  const fetchScenarioConversations = async (scenarioId) => {
    try {
      setScenariosLoading(true)
      const { data, error } = await supabase
        .from('scenario_conversations')
        .select('*')
        .eq('scenario_id', scenarioId)
        .eq('is_active', true)
        .order('level')

      if (error) {
        console.error('Error fetching scenario conversations:', error)
        return
      }

      setScenarioConversations(data || [])
      // Set first conversation as current
      if (data && data.length > 0) {
        setCurrentConversation(data[0])
        setCurrentScenarioLevel(1)
      }
    } catch (error) {
      console.error('Error fetching scenario conversations:', error)
    } finally {
      setScenariosLoading(false)
    }
  }

  // Fetch user progress for scenarios
  const fetchUserScenarioProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_scenario_progress')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching user scenario progress:', error)
        return
      }

      const progressMap = {}
      data?.forEach(progress => {
        progressMap[progress.scenario_id] = progress
      })
      setUserScenarioProgress(progressMap)
    } catch (error) {
      console.error('Error fetching user scenario progress:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    fetchUserProgress()
    fetchWordCategories()
    fetchScenarios()
    fetchUserScenarioProgress()
  }, [])

  // Fetch activities when practice type or level changes
  useEffect(() => {
    if (currentPractice && practiceLevel) {
      fetchActivities(currentPractice, practiceLevel)
    }
  }, [currentPractice, practiceLevel])

  // Submit level answers and calculate score
  const submitLevel = async () => {
    if (!currentActivity) return

    let correctCount = 0
    const totalQuestions = getTotalQuestions()

    // Calculate score based on activity type
    if (currentPractice === 'fill_blank') {
      correctCount = userAnswers.filter((answer, index) => {
        const question = currentActivity.content.questions[index]
        return answer?.toUpperCase() === question?.answer?.toUpperCase()
      }).length
    } else if (currentPractice === 'word_matching') {
      const pairs = currentActivity.content.pairs
      correctCount = matchedPairs.filter(match => {
        const pair = pairs.find(p => p.english === match.english)
        return pair && pair.somali === match.somali
      }).length
    } else if (currentPractice === 'listen_choose') {
      correctCount = userAnswers.filter((answer, index) => {
        const question = currentActivity.content.questions[index]
        return answer === question?.correct_answer
      }).length
    }

    const score = Math.round((correctCount / totalQuestions) * 100)
    setLevelScore(score)
    setShowResults(true)

    // Save progress to database
    await saveProgress(score, correctCount, totalQuestions)

    // Auto-advance to next level if score >= 80%
    if (score >= 80 && practiceLevel < 12) {
      setTimeout(() => {
        setPracticeLevel(practiceLevel + 1)
        setShowResults(false)
      }, 3000)
    }
  }

  // Save user progress to database
  const saveProgress = async (score, correctCount, totalQuestions) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const isCompleted = score >= 80
      const newHighestLevel = isCompleted ? Math.max(userProgress[currentPractice].highest_level, practiceLevel + 1) : userProgress[currentPractice].highest_level

      // Upsert user progress
      await supabase
        .from('user_practice_progress')
        .upsert({
          user_id: user.id,
          activity_type: currentPractice,
          level: practiceLevel,
          highest_level_unlocked: newHighestLevel,
          level_score: score,
          is_completed: isCompleted,
          completion_percentage: (correctCount / totalQuestions) * 100,
          last_attempt_at: new Date().toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null
        })

      // Update local progress state
      setUserProgress(prev => ({
        ...prev,
        [currentPractice]: {
          ...prev[currentPractice],
          highest_level: newHighestLevel,
          completed_levels: isCompleted ? 
            [...prev[currentPractice].completed_levels.filter(l => l !== practiceLevel), practiceLevel] :
            prev[currentPractice].completed_levels
        }
      }))

    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  // Get total questions for current activity
  const getTotalQuestions = () => {
    if (!currentActivity?.content) return 0
    
    if (currentPractice === 'fill_blank' || currentPractice === 'listen_choose') {
      return currentActivity.content.questions?.length || 0
    } else if (currentPractice === 'word_matching') {
      return currentActivity.content.pairs?.length || 0
    }
    return 0
  }

  // Check if level can be submitted (all questions answered)
  const canSubmitLevel = () => {
    const totalQuestions = getTotalQuestions()
    
    if (currentPractice === 'word_matching') {
      return matchedPairs.length === totalQuestions
    } else {
      return userAnswers.filter(answer => answer !== undefined && answer !== '').length === totalQuestions
    }
  }

  // Activity-specific handlers
  
  // Handle Fill in the Blank answer input
  const handleFillBlankAnswer = (questionIndex, value) => {
    const newAnswers = [...userAnswers]
    newAnswers[questionIndex] = value.toUpperCase()
    setUserAnswers(newAnswers)
  }

  // Handle Word Matching selection
  const handleWordMatch = (word, isEnglish) => {
    if (isEnglish) {
      setSelectedWord(selectedWord === word ? null : word)
    } else {
      if (selectedWord) {
        const newMatch = { english: selectedWord, somali: word }
        setMatchedPairs(prev => [...prev, newMatch])
        setSelectedWord(null)
      }
    }
  }

  // Handle Listen & Choose answer selection
  const handleListenAnswer = (questionIndex, answer) => {
    const newAnswers = [...userAnswers]
    newAnswers[questionIndex] = answer
    setUserAnswers(newAnswers)
  }

  // Remove a matched pair
  const removeMatch = (matchIndex) => {
    setMatchedPairs(prev => prev.filter((_, index) => index !== matchIndex))
  }

  // Foundation Learning Data
  const alphabetData = [
    { letter: 'A', example: 'Apple', somali: 'Tufaax', image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=300&h=300&fit=crop&crop=center', emoji: '🍎' },
    { letter: 'B', example: 'Book', somali: 'Buug', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=300&fit=crop&crop=center', emoji: '📚' },
    { letter: 'C', example: 'Cat', somali: 'Bisad', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=center', emoji: '🐱' },
    { letter: 'D', example: 'Dog', somali: 'Eey', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=center', emoji: '🐶' },
    { letter: 'E', example: 'Egg', somali: 'Ukun', image: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=300&h=300&fit=crop&crop=center', emoji: '🥚' },
    { letter: 'F', example: 'Fish', somali: 'Mallaay', image: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=300&h=300&fit=crop&crop=center', emoji: '🐟' },
    { letter: 'G', example: 'Good', somali: 'Fiican', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop&crop=center', emoji: '👍' },
    { letter: 'H', example: 'House', somali: 'Guri', image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=300&h=300&fit=crop&crop=center', emoji: '🏠' },
    { letter: 'I', example: 'Ice', somali: 'Baraf', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop&crop=center', emoji: '🧊' },
    { letter: 'J', example: 'Jump', somali: 'Bood', image: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=300&h=300&fit=crop&crop=center', emoji: '🏃' },
    { letter: 'K', example: 'Key', somali: 'Fure', image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=300&h=300&fit=crop&crop=center', emoji: '🔑' },
    { letter: 'L', example: 'Love', somali: 'Jacayl', image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=300&h=300&fit=crop&crop=center', emoji: '❤️' },
    { letter: 'M', example: 'Money', somali: 'Lacag', image: 'https://images.unsplash.com/photo-1554672723-d42a16e533db?w=300&h=300&fit=crop&crop=center', emoji: '💰' },
    { letter: 'N', example: 'Name', somali: 'Magac', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=300&fit=crop&crop=center', emoji: '📛' },
    { letter: 'O', example: 'Open', somali: 'Fur', image: 'https://images.unsplash.com/photo-1505226755623-e9436dab1cd5?w=300&h=300&fit=crop&crop=center', emoji: '🚪' },
    { letter: 'P', example: 'Phone', somali: 'Taleefan', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&crop=center', emoji: '📱' },
    { letter: 'Q', example: 'Question', somali: 'Su\'aal', image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=300&h=300&fit=crop&crop=center', emoji: '❓' },
    { letter: 'R', example: 'Road', somali: 'Waddo', image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=300&fit=crop&crop=center', emoji: '🛣️' },
    { letter: 'S', example: 'Sun', somali: 'Qorax', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop&crop=center', emoji: '☀️' },
    { letter: 'T', example: 'Time', somali: 'Waqti', image: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=300&h=300&fit=crop&crop=center', emoji: '⏰' },
    { letter: 'U', example: 'Under', somali: 'Hoosta', image: 'https://images.unsplash.com/photo-1558618047-72c0c2c630c5?w=300&h=300&fit=crop&crop=center', emoji: '⬇️' },
    { letter: 'V', example: 'Voice', somali: 'Cod', image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop&crop=center', emoji: '🔊' },
    { letter: 'W', example: 'Water', somali: 'Biyo', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop&crop=center', emoji: '💧' },
    { letter: 'X', example: 'X-ray', somali: 'Raajo', image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=300&h=300&fit=crop&crop=center', emoji: '🩻' },
    { letter: 'Y', example: 'Yes', somali: 'Haa', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop&crop=center', emoji: '✅' },
    { letter: 'Z', example: 'Zero', somali: 'Eber', image: 'https://images.unsplash.com/photo-1518107616985-bd48230d3b20?w=300&h=300&fit=crop&crop=center', emoji: '0️⃣' }
  ]



  // Handle word category selection
  const handleCategorySelect = (categoryName) => {
    setSelectedWordCategory(categoryName)
    fetchCategoryWords(categoryName)
  }

  const essentialWords_OLD = [
    // Greetings & Basic Communication
    { english: 'Hello', somali: 'Salaan', category: 'Greetings', difficulty: 'Easy' },
    { english: 'Goodbye', somali: 'Nabadgelyo', category: 'Greetings', difficulty: 'Easy' },
    { english: 'Thank you', somali: 'Mahadsanid', category: 'Greetings', difficulty: 'Easy' },
    { english: 'Please', somali: 'Fadlan', category: 'Greetings', difficulty: 'Easy' },
    { english: 'Sorry', somali: 'Raali ahow', category: 'Greetings', difficulty: 'Easy' },
    { english: 'Yes', somali: 'Haa', category: 'Basic', difficulty: 'Easy' },
    { english: 'No', somali: 'Maya', category: 'Basic', difficulty: 'Easy' },
    { english: 'Help', somali: 'Caawimaad', category: 'Basic', difficulty: 'Easy' },
    { english: 'Water', somali: 'Biyo', category: 'Basic', difficulty: 'Easy' },
    { english: 'Food', somali: 'Cunto', category: 'Basic', difficulty: 'Easy' },
    
    // Family & People
    { english: 'Mother', somali: 'Hooyo', category: 'Family', difficulty: 'Easy' },
    { english: 'Father', somali: 'Aabo', category: 'Family', difficulty: 'Easy' },
    { english: 'Brother', somali: 'Walaal', category: 'Family', difficulty: 'Easy' },
    { english: 'Sister', somali: 'Gabadh', category: 'Family', difficulty: 'Easy' },
    { english: 'Child', somali: 'Caruur', category: 'Family', difficulty: 'Easy' },
    { english: 'Friend', somali: 'Saaxiib', category: 'People', difficulty: 'Easy' },
    { english: 'Doctor', somali: 'Dhakhaatiir', category: 'People', difficulty: 'Medium' },
    { english: 'Teacher', somali: 'Macalin', category: 'People', difficulty: 'Easy' },
    { english: 'Student', somali: 'Arday', category: 'People', difficulty: 'Easy' },
    { english: 'Police', somali: 'Booliska', category: 'People', difficulty: 'Medium' },
    
    // Places & Locations
    { english: 'House', somali: 'Guri', category: 'Places', difficulty: 'Easy' },
    { english: 'School', somali: 'Dugsiga', category: 'Places', difficulty: 'Easy' },
    { english: 'Hospital', somali: 'Cisbitaal', category: 'Places', difficulty: 'Medium' },
    { english: 'Shop', somali: 'Dukaan', category: 'Places', difficulty: 'Easy' },
    { english: 'Office', somali: 'Xafiis', category: 'Places', difficulty: 'Medium' },
    { english: 'Bank', somali: 'Bangiga', category: 'Places', difficulty: 'Easy' },
    { english: 'Restaurant', somali: 'Makhaayadda', category: 'Places', difficulty: 'Medium' },
    { english: 'Airport', somali: 'Garoonka', category: 'Places', difficulty: 'Medium' },
    { english: 'Bus', somali: 'Bas', category: 'Transport', difficulty: 'Easy' },
    { english: 'Car', somali: 'Baabuur', category: 'Transport', difficulty: 'Easy' },
    
    // Time & Numbers
    { english: 'Today', somali: 'Maanta', category: 'Time', difficulty: 'Easy' },
    { english: 'Tomorrow', somali: 'Berri', category: 'Time', difficulty: 'Easy' },
    { english: 'Yesterday', somali: 'Shalay', category: 'Time', difficulty: 'Easy' },
    { english: 'Morning', somali: 'Subax', category: 'Time', difficulty: 'Easy' },
    { english: 'Evening', somali: 'Fiid', category: 'Time', difficulty: 'Easy' },
    { english: 'Night', somali: 'Habeen', category: 'Time', difficulty: 'Easy' },
    { english: 'One', somali: 'Hal', category: 'Numbers', difficulty: 'Easy' },
    { english: 'Two', somali: 'Laba', category: 'Numbers', difficulty: 'Easy' },
    { english: 'Three', somali: 'Saddex', category: 'Numbers', difficulty: 'Easy' },
    { english: 'Ten', somali: 'Toban', category: 'Numbers', difficulty: 'Easy' },
    
    // Essential Actions
    { english: 'Go', somali: 'Aad', category: 'Actions', difficulty: 'Easy' },
    { english: 'Come', somali: 'Kaalay', category: 'Actions', difficulty: 'Easy' },
    { english: 'See', somali: 'Arag', category: 'Actions', difficulty: 'Easy' },
    { english: 'Hear', somali: 'Maqal', category: 'Actions', difficulty: 'Easy' },
    { english: 'Speak', somali: 'Hadal', category: 'Actions', difficulty: 'Easy' },
    { english: 'Read', somali: 'Akhri', category: 'Actions', difficulty: 'Easy' },
    { english: 'Write', somali: 'Qor', category: 'Actions', difficulty: 'Easy' },
    { english: 'Work', somali: 'Shaqo', category: 'Actions', difficulty: 'Easy' },
    { english: 'Sleep', somali: 'Hurdo', category: 'Actions', difficulty: 'Easy' },
    { english: 'Eat', somali: 'Cun', category: 'Actions', difficulty: 'Easy' },
    
    // Essential Items
    { english: 'Money', somali: 'Lacag', category: 'Items', difficulty: 'Easy' },
    { english: 'Phone', somali: 'Taleefan', category: 'Items', difficulty: 'Easy' },
    { english: 'Book', somali: 'Buug', category: 'Items', difficulty: 'Easy' },
    { english: 'Key', somali: 'Fure', category: 'Items', difficulty: 'Easy' },
    { english: 'Door', somali: 'Albaab', category: 'Items', difficulty: 'Easy' },
    { english: 'Window', somali: 'Daaqad', category: 'Items', difficulty: 'Easy' },
    { english: 'Table', somali: 'Miis', category: 'Items', difficulty: 'Easy' },
    { english: 'Chair', somali: 'Kursi', category: 'Items', difficulty: 'Easy' },
    { english: 'Bed', somali: 'Sariir', category: 'Items', difficulty: 'Easy' },
    { english: 'Clothes', somali: 'Dhar', category: 'Items', difficulty: 'Easy' },
    
    // Colors & Descriptions
    { english: 'Red', somali: 'Cas', category: 'Colors', difficulty: 'Easy' },
    { english: 'Blue', somali: 'Buluug', category: 'Colors', difficulty: 'Easy' },
    { english: 'Green', somali: 'Cagaar', category: 'Colors', difficulty: 'Easy' },
    { english: 'White', somali: 'Caddaan', category: 'Colors', difficulty: 'Easy' },
    { english: 'Black', somali: 'Madow', category: 'Colors', difficulty: 'Easy' },
    { english: 'Big', somali: 'Weyn', category: 'Descriptions', difficulty: 'Easy' },
    { english: 'Small', somali: 'Yar', category: 'Descriptions', difficulty: 'Easy' },
    { english: 'Good', somali: 'Fiican', category: 'Descriptions', difficulty: 'Easy' },
    { english: 'Bad', somali: 'Xun', category: 'Descriptions', difficulty: 'Easy' },
    { english: 'Hot', somali: 'Kulul', category: 'Descriptions', difficulty: 'Easy' },
    
    // Questions & Directions
    { english: 'What', somali: 'Maxay', category: 'Questions', difficulty: 'Easy' },
    { english: 'Where', somali: 'Xaggee', category: 'Questions', difficulty: 'Easy' },
    { english: 'When', somali: 'Goormaa', category: 'Questions', difficulty: 'Easy' },
    { english: 'How', somali: 'Sidee', category: 'Questions', difficulty: 'Easy' },
    { english: 'Why', somali: 'Maxaa darteed', category: 'Questions', difficulty: 'Medium' },
    { english: 'Left', somali: 'Bidix', category: 'Directions', difficulty: 'Easy' },
    { english: 'Right', somali: 'Midig', category: 'Directions', difficulty: 'Easy' },
    { english: 'Up', somali: 'Kor', category: 'Directions', difficulty: 'Easy' },
    { english: 'Down', somali: 'Hoos', category: 'Directions', difficulty: 'Easy' },
    { english: 'Here', somali: 'Halkan', category: 'Directions', difficulty: 'Easy' },
    
    // Emergency & Important
    { english: 'Emergency', somali: 'Degdeg', category: 'Emergency', difficulty: 'Medium' },
    { english: 'Medicine', somali: 'Dawo', category: 'Emergency', difficulty: 'Medium' },
    { english: 'Pain', somali: 'Xanuun', category: 'Emergency', difficulty: 'Easy' },
    { english: 'Sick', somali: 'Bukaan', category: 'Emergency', difficulty: 'Easy' },
    { english: 'Name', somali: 'Magac', category: 'Important', difficulty: 'Easy' },
    { english: 'Address', somali: 'Cinwaanka', category: 'Important', difficulty: 'Medium' },
    { english: 'Age', somali: 'Da\'da', category: 'Important', difficulty: 'Easy' },
    { english: 'Country', somali: 'Waddan', category: 'Important', difficulty: 'Easy' },
    { english: 'Language', somali: 'Luqad', category: 'Important', difficulty: 'Easy' },
    { english: 'English', somali: 'Ingiriis', category: 'Important', difficulty: 'Easy' }
  ]

  // Old grouping logic - removed for database approach

  return (
    <div className="foundation-section space-y-10">
      {/* Foundation Categories - Show when no category is selected */}
      {!activeCategory && (
        <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-2xl border border-purple-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-8 border-b border-purple-400/20">
            <h3 className="text-4xl font-bold text-white flex items-center gap-4 mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-4xl">
                🎯
              </div>
              Pre-English Foundation
            </h3>
            <p className="text-purple-200 text-xl mt-3">Start with the basics - Build your English foundation step by step</p>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { 
                  key: 'alphabet', 
                  label: 'English Alphabet', 
                  image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop&crop=center',
                  description: '26 letters with examples',
                  color: 'from-blue-400 to-indigo-500',
                  gradient: 'from-blue-500/15 to-indigo-500/15',
                  border: 'border-blue-400/25'
                },
                { 
                  key: 'scenarios', 
                  label: 'Real-Life Scenarios', 
                  image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&crop=center',
                  description: 'Daily conversations',
                  color: 'from-emerald-400 to-green-500',
                  gradient: 'from-emerald-500/15 to-green-500/15',
                  border: 'border-emerald-400/25'
                },
                { 
                  key: 'words', 
                  label: '1000+ Essential Words', 
                  image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop&crop=center',
                  description: 'Comprehensive vocabulary',
                  color: 'from-amber-400 to-orange-500',
                  gradient: 'from-amber-500/15 to-orange-500/15',
                  border: 'border-amber-400/25'
                },
                { 
                  key: 'practice', 
                  label: 'Practice Activities', 
                  image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop&crop=center',
                  description: 'Interactive exercises',
                  color: 'from-purple-400 to-pink-500',
                  gradient: 'from-purple-500/15 to-pink-500/15',
                  border: 'border-purple-400/25'
                }
              ].map((category) => (
                <div key={category.key}
                     onClick={() => setActiveCategory(category.key)}
                     className={`group cursor-pointer rounded-2xl border transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden ${category.border} bg-gradient-to-br ${category.gradient} hover:shadow-${category.color.split('-')[1]}-500/25`}>
                  
                  {/* Image Cover */}
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={category.image} 
                      alt={category.label}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextElementSibling.style.display = 'flex'
                      }}
                    />
                    {/* Fallback gradient if image fails */}
                    <div 
                      className={`w-full h-full hidden items-center justify-center bg-gradient-to-br ${category.color}`}
                      style={{ display: 'none' }}
                    >
                      <div className="text-7xl text-white drop-shadow-lg">
                        {category.key === 'alphabet' ? '🔤' : 
                         category.key === 'scenarios' ? '💬' : 
                         category.key === 'words' ? '📝' : '🎮'}
                      </div>
                    </div>
                    
                    {/* Overlay gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-80`}></div>
                    
                    {/* Label overlay */}
                    <div className="absolute bottom-6 left-6 right-6">
                      <h4 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                        {category.label}
                      </h4>
                      <p className="text-lg text-white/90 font-medium">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover effect indicator */}
                  <div className="p-6 text-center">
                    <div className="text-white/60 text-base font-medium group-hover:text-white transition-colors duration-300">
                      Click to explore →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* English Alphabet Section */}
      {activeCategory === 'alphabet' && (
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-800/10 rounded-2xl border border-blue-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 p-6 border-b border-blue-400/20">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-2xl">
                  🔤
                </div>
                English Alphabet
              </h3>
              <button onClick={() => setActiveCategory(null)} className="text-blue-300 hover:text-white">
                ← Back
              </button>
            </div>
            <p className="text-blue-200 mt-2">Learn the 26 letters of the English alphabet with examples and pronunciation</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {alphabetData.map((item) => (
                <div key={item.letter} 
                     className="group bg-gradient-to-br from-blue-500/8 to-indigo-500/8 backdrop-blur-sm rounded-3xl p-6 border border-blue-400/20 hover:border-blue-400/40 transition-all duration-500 hover:bg-blue-500/15 hover:scale-105 hover:shadow-2xl hover:shadow-blue-400/20">
                  <div className="text-center">
                    {/* Letter - Bigger and more prominent */}
                    <div className="text-8xl font-bold text-white mb-6 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                      {item.letter}
                    </div>
                    
                    {/* Image - Much bigger and better styled */}
                    <div className="relative mb-6 flex justify-center">
                      <div className="w-40 h-40 rounded-3xl overflow-hidden bg-white/10 border-2 border-white/20 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                        <img 
                          src={item.image} 
                          alt={item.example}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextElementSibling.style.display = 'flex'
                          }}
                        />
                        <div 
                          className="w-full h-full hidden items-center justify-center text-4xl bg-gradient-to-br from-blue-400/25 to-indigo-600/25"
                          style={{ display: 'none' }}
                        >
                          {item.emoji}
                        </div>
                      </div>
                    </div>
                    
                    {/* Text - Cleaner and more prominent */}
                                          <div className="text-lg font-bold text-white mb-2 group-hover:text-blue-100 transition-colors">
                      {item.example}
                    </div>
                                          <div className="text-sm text-blue-200 mb-4 font-medium">
                      {item.somali}
                    </div>
                    
                    {/* Sound Button - Better styled */}
                    <button 
                      onClick={() => playAudio && playAudio(`letter-${item.letter}`, `${item.letter} for ${item.example}`)}
                      className="bg-blue-500/25 hover:bg-blue-400/40 text-blue-300 hover:text-white transition-all duration-300 p-3 rounded-full hover:scale-110 hover:shadow-lg border border-blue-400/25"
                      title={`Listen to "${item.letter} for ${item.example}"`}
                    >
                      🔊
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-Life Scenarios Section */}
      {activeCategory === 'scenarios' && !selectedScenario && (
        <div className="bg-gradient-to-br from-green-600/10 to-green-800/10 rounded-2xl border border-green-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600/20 to-green-800/20 p-6 border-b border-green-400/20">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center text-2xl">
                  💬
                </div>
                Real-Life Scenarios
              </h3>
              <button onClick={() => setActiveCategory(null)} className="text-green-300 hover:text-white">
                ← Back
              </button>
            </div>
            <p className="text-green-200 mt-2">Daily conversations designed for 18-25 year olds - Practice real situations you'll encounter</p>
          </div>
          
          <div className="p-4">
            {scenariosLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-3"></div>
                <p className="text-gray-300 text-sm">Loading scenarios...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {scenarios.map((scenario) => {
                  const progress = userScenarioProgress[scenario.id]
                  const completedLevels = progress?.levels_completed?.length || 0
                  
                  // Enhanced scenario data with icons and colors - using EXACT database names
                  const scenarioEnhancement = {
                    'Campus Life & University': {
                      icon: '🎓',
                      color: 'from-blue-500 to-indigo-600',
                      description: 'Campus life & academics'
                    },
                    'Job Interviews & Career': {
                      icon: '💼',
                      color: 'from-green-500 to-emerald-600',
                      description: 'Professional interviews'
                    },
                    'Social Media & Technology': {
                      icon: '📱',
                      color: 'from-red-500 to-pink-600',
                      description: 'Online interactions'
                    },
                    'Dating & Relationships': {
                      icon: '❤️',
                      color: 'from-pink-500 to-rose-600',
                      description: 'Dating & relationships'
                    },
                    'Roommates & Shared Living': {
                      icon: '🏠',
                      color: 'from-orange-500 to-amber-600',
                      description: 'Living with roommates'
                    },
                    'Food & Restaurant Experiences': {
                      icon: '🍕',
                      color: 'from-orange-500 to-red-600',
                      description: 'Restaurants & dining'
                    },
                    'Health & Fitness': {
                      icon: '🏥',
                      color: 'from-emerald-500 to-green-600',
                      description: 'Health & wellness'
                    },
                    'Travel & Transportation': {
                      icon: '🚗',
                      color: 'from-cyan-500 to-blue-600',
                      description: 'Transport & travel'
                    },
                    'Banking & Finance': {
                      icon: '💰',
                      color: 'from-yellow-500 to-orange-600',
                      description: 'Money & banking'
                    },
                    'Emergency Situations': {
                      icon: '🚨',
                      color: 'from-red-500 to-pink-600',
                      description: 'Emergency & safety'
                    }
                  }
                  
                  const enhancement = scenarioEnhancement[scenario.category_name] || {}
                  
                  return (
                    <div 
                      key={scenario.id}
                      onClick={() => {
                        setSelectedScenario(scenario)
                        fetchScenarioConversations(scenario.id)
                      }}
                      className="group cursor-pointer bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-sm rounded-xl border border-white/10 hover:border-green-400/50 transition-all duration-300 hover:bg-white/10 hover:scale-105 shadow-lg hover:shadow-xl overflow-hidden"
                    >
                      {/* Large Icon Header */}
                      <div className={`h-24 bg-gradient-to-br ${enhancement.color} flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                        <div className="text-6xl font-bold text-white drop-shadow-lg mb-1">
                          {enhancement.icon}
                        </div>
                        {/* Fallback text in case emoji doesn't display */}
                        <div className="text-sm text-white/90 font-bold">
                          {scenario.category_name.split(' ')[0]}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        {/* Title and Somali Translation */}
                        <div className="text-center mb-3">
                          <h4 className="text-lg font-bold text-white mb-1 group-hover:scale-105 transition-transform">
                            {scenario.category_name}
                          </h4>
                          <p className="text-sm text-green-300 opacity-90">
                            {scenario.category_name_somali}
                          </p>
                        </div>
                        
                        {/* Simple Description */}
                        <p className="text-xs text-gray-300 mb-3 text-center">
                          {enhancement.description}
                        </p>
                        
                        {/* Simple Badge */}
                        <div className="flex justify-center mb-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            scenario.difficulty_level === 'Beginner' ? 'bg-green-600/30 text-green-300 border border-green-500/30' :
                            scenario.difficulty_level === 'Intermediate' ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/30' :
                            'bg-red-600/30 text-red-300 border border-red-500/30'
                          }`}>
                            {scenario.difficulty_level} • {scenario.relevance_percentage}% relevant
                          </span>
                        </div>
                        
                        {/* Progress or Start */}
                        <div className="text-center">
                          {progress ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                              <span className="text-purple-300 font-medium text-xs">
                                {completedLevels}/{scenario.total_levels} levels
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-green-300 font-medium text-xs">
                                Start Learning
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Scenario Conversations */}
      {activeCategory === 'scenarios' && selectedScenario && (
        <div className="bg-gradient-to-br from-green-600/10 to-green-800/10 rounded-2xl border border-green-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600/20 to-green-800/20 p-6 border-b border-green-400/20">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center text-2xl">
                  {selectedScenario.icon_emoji}
                </div>
                {selectedScenario.category_name}
              </h3>
              <button 
                onClick={() => {
                  setSelectedScenario(null)
                  setScenarioConversations([])
                  setCurrentConversation(null)
                }} 
                className="text-green-300 hover:text-white"
              >
                ← Back to Scenarios
              </button>
            </div>
            <p className="text-green-200 mt-2">
              {selectedScenario.description} - {selectedScenario.category_name_somali}
            </p>
            <div className="text-sm text-green-300 mt-1">
              Visual: {selectedScenario.visual_description}
            </div>
          </div>
          
          <div className="p-6">
            {scenariosLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading conversations...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Level Selection */}
                <div className="flex gap-2 flex-wrap justify-center mb-6">
                  {scenarioConversations.map((conversation) => (
                    <button
                      key={conversation.level}
                      onClick={() => {
                        setCurrentConversation(conversation)
                        setCurrentScenarioLevel(conversation.level)
                      }}
                      className={`px-3 py-2 rounded-xl font-medium transition-all duration-200 text-sm ${
                        currentScenarioLevel === conversation.level 
                          ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/25 scale-105' 
                          : 'bg-white/5 text-green-300 hover:bg-white/10 hover:scale-105 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          currentScenarioLevel === conversation.level ? 'bg-white' : 'bg-green-400'
                        }`}></div>
                        <span>Level {conversation.level}</span>
                      </div>
                      <div className="text-xs opacity-80 mt-1">
                        {conversation.level_title}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Current Conversation Content */}
                {currentConversation && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <div className="text-center mb-6">
                      <h4 className="text-xl font-bold text-white mb-2">
                        Level {currentConversation.level}: {currentConversation.level_title}
                      </h4>
                      <p className="text-gray-300">{currentConversation.level_description}</p>
                    </div>

                    {/* Conversation Dialogues */}
                    {currentConversation.conversation_data.dialogues && (
                      <div className="space-y-4">
                        {currentConversation.conversation_data.dialogues.map((dialogue, dialogueIndex) => (
                          <div key={dialogueIndex} className="bg-gradient-to-r from-white/5 to-white/3 rounded-2xl p-4 border border-white/10 shadow-lg">
                            {/* Conversation Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {dialogueIndex + 1}
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-white">
                                    {dialogue.person1.name} & {dialogue.person2.name}
                                  </h5>
                                  <p className="text-xs text-gray-400">
                                    {dialogue.person1.role} • {dialogue.person2.role}
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full">
                                {dialogue.exchanges.length} exchanges
                              </div>
                            </div>
                            
                            {/* Chat Messages */}
                            <div className="space-y-3">
                              {dialogue.exchanges.map((exchange, exchangeIndex) => (
                                <div key={exchangeIndex} className={`flex ${
                                  exchange.speaker === dialogue.person1.name ? 'justify-start' : 'justify-end'
                                }`}>
                                  <div className={`max-w-[400px] p-4 rounded-2xl shadow-sm ${
                                    exchange.speaker === dialogue.person1.name 
                                      ? 'bg-gradient-to-br from-emerald-600/40 to-emerald-700/30 border border-emerald-500/20' 
                                      : 'bg-gradient-to-br from-orange-600/40 to-orange-700/30 border border-orange-500/20'
                                  }`}>
                                    {/* Speaker Badge */}
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                                      exchange.speaker === dialogue.person1.name 
                                        ? 'bg-emerald-500/20 text-emerald-300' 
                                        : 'bg-orange-500/20 text-orange-300'
                                    }`}>
                                      <div className={`w-2 h-2 rounded-full ${
                                        exchange.speaker === dialogue.person1.name ? 'bg-emerald-400' : 'bg-orange-400'
                                      }`}></div>
                                      {exchange.speaker}
                                    </div>
                                    
                                    {/* English Text */}
                                    <div className="text-white font-medium text-sm leading-relaxed mb-2">
                                      {exchange.english}
                                    </div>
                                    
                                    {/* Somali Translation */}
                                    <div className="text-gray-300 text-xs italic leading-relaxed mb-3">
                                      {exchange.somali}
                                    </div>
                                    
                                    {/* Audio Button */}
                                    <div className="flex justify-end">
                                      <button 
                                        onClick={() => {
                                          playAudio && playAudio(`scenario-${dialogueIndex}-${exchangeIndex}`, exchange.english)
                                        }}
                                        className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                                          exchange.speaker === dialogue.person1.name 
                                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                                            : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                        }`}
                                        title={`Listen to "${exchange.english}"`}
                                      >
                                        🔊
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cultural Notes */}
                    {currentConversation.cultural_notes && (
                      <div className="mt-6 bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-4">
                        <h6 className="text-yellow-300 font-bold mb-2 flex items-center gap-2">
                          💡 Cultural Tips
                        </h6>
                        <p className="text-yellow-200 text-sm">{currentConversation.cultural_notes}</p>
                      </div>
                    )}

                    {/* Vocabulary Focus */}
                    {currentConversation.vocabulary_focus && currentConversation.vocabulary_focus.length > 0 && (
                      <div className="mt-6 bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
                        <h6 className="text-emerald-300 font-bold mb-2 flex items-center gap-2">
                          📚 Key Vocabulary
                        </h6>
                        <div className="flex flex-wrap gap-2">
                          {currentConversation.vocabulary_focus.map((word, index) => (
                            <span key={index} className="text-xs px-3 py-1 bg-emerald-600/20 text-emerald-300 rounded-full">
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1000+ Essential Words Section */}
      {activeCategory === 'words' && !selectedWordCategory && (
        <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-800/10 rounded-2xl border border-yellow-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 p-6 border-b border-yellow-400/20">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl flex items-center justify-center text-2xl">
                  📝
                </div>
                1000+ Essential Words
              </h3>
              <button onClick={() => setActiveCategory(null)} className="text-yellow-300 hover:text-white">
                ← Back
              </button>
            </div>
            <p className="text-yellow-200 mt-2">Comprehensive vocabulary organized by categories - Click a category to explore words</p>
          </div>
          
          <div className="p-6">
            {wordsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading categories...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {wordCategories.map((category) => {
                  // Enhanced category data with images and colors
                  const categoryEnhancement = {
                    'Food': {
                      image: 'https://images.unsplash.com/photo-1504674900240-9c8500b3c8e8?w=400&h=300&fit=crop&crop=center',
                      color: 'from-orange-500 to-red-600',
                      gradient: 'from-orange-600/20 to-red-600/20',
                      border: 'border-orange-500/30'
                    },
                    'Actions': {
                      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center',
                      color: 'from-blue-500 to-indigo-600',
                      gradient: 'from-blue-600/20 to-indigo-600/20',
                      border: 'border-blue-500/30'
                    },
                    'Family': {
                      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&crop=center',
                      color: 'from-pink-500 to-rose-600',
                      gradient: 'from-pink-600/20 to-rose-600/20',
                      border: 'border-pink-500/30'
                    },
                    'Places': {
                      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center',
                      color: 'from-emerald-500 to-green-600',
                      gradient: 'from-emerald-600/20 to-green-600/20',
                      border: 'border-emerald-500/30'
                    },
                    'Transportation': {
                      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center',
                      color: 'from-cyan-500 to-blue-600',
                      gradient: 'from-cyan-600/20 to-blue-600/20',
                      border: 'border-cyan-500/30'
                    },
                    'Colors': {
                      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                      color: 'from-purple-500 to-violet-600',
                      gradient: 'from-purple-600/20 to-violet-600/20',
                      border: 'border-purple-500/30'
                    },
                    'Numbers': {
                      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop&crop=center',
                      color: 'from-slate-500 to-gray-600',
                      gradient: 'from-slate-600/20 to-gray-600/20',
                      border: 'border-slate-500/30'
                    },
                    'Time': {
                      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                      color: 'from-amber-500 to-orange-600',
                      gradient: 'from-amber-600/20 to-orange-600/20',
                      border: 'border-amber-500/30'
                    },
                    'Body': {
                      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center',
                      color: 'from-red-500 to-pink-600',
                      gradient: 'from-red-600/20 to-pink-600/20',
                      border: 'border-red-500/30'
                    },
                    'Health': {
                      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop&crop=center',
                      color: 'from-green-500 to-emerald-600',
                      gradient: 'from-green-600/20 to-emerald-600/20',
                      border: 'border-green-500/30'
                    },
                    'Weather': {
                      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                      color: 'from-sky-500 to-blue-600',
                      gradient: 'from-sky-600/20 to-blue-600/20',
                      border: 'border-sky-500/30'
                    },
                    'Clothing': {
                      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop&crop=center',
                      color: 'from-fuchsia-500 to-purple-600',
                      gradient: 'from-fuchsia-600/20 to-purple-600/20',
                      border: 'border-fuchsia-500/30'
                    },
                    'Technology': {
                      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center',
                      color: 'from-indigo-500 to-purple-600',
                      gradient: 'from-indigo-600/20 to-purple-600/20',
                      border: 'border-indigo-500/30'
                    },
                    'Business': {
                      image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=300&fit=crop&crop=center',
                      color: 'from-blue-500 to-indigo-600',
                      gradient: 'from-blue-600/20 to-indigo-600/20',
                      border: 'border-blue-500/30'
                    },
                    'Education': {
                      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&crop=center',
                      color: 'from-yellow-500 to-amber-600',
                      gradient: 'from-yellow-600/20 to-amber-600/20',
                      border: 'border-yellow-500/30'
                    },
                    'Money': {
                      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop&crop=center',
                      color: 'from-green-500 to-emerald-600',
                      gradient: 'from-green-600/20 to-emerald-600/20',
                      border: 'border-green-500/30'
                    },
                    'Emotions': {
                      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center',
                      color: 'from-pink-500 to-rose-600',
                      gradient: 'from-pink-600/20 to-rose-600/20',
                      border: 'border-pink-500/30'
                    },
                    'Greetings': {
                      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center',
                      color: 'from-yellow-500 to-orange-600',
                      gradient: 'from-yellow-600/20 to-orange-600/20',
                      border: 'border-yellow-500/30'
                    },
                    'People': {
                      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&crop=center',
                      color: 'from-blue-500 to-cyan-600',
                      gradient: 'from-blue-600/20 to-cyan-600/20',
                      border: 'border-blue-500/30'
                    },
                    'Leisure': {
                      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                      color: 'from-purple-500 to-pink-600',
                      gradient: 'from-purple-600/20 to-pink-600/20',
                      border: 'border-purple-500/30'
                    },
                    'Descriptions': {
                      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                      color: 'from-slate-500 to-gray-600',
                      gradient: 'from-slate-600/20 to-gray-600/20',
                      border: 'border-slate-500/30'
                    },
                    'Important': {
                      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                      color: 'from-yellow-500 to-orange-600',
                      gradient: 'from-yellow-600/20 to-orange-600/20',
                      border: 'border-yellow-500/30'
                    }
                  }
                  
                  const enhancement = categoryEnhancement[category.name] || {
                    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                    color: 'from-gray-500 to-slate-600',
                    gradient: 'from-gray-600/20 to-slate-600/20',
                    border: 'border-gray-500/30'
                  }
                  
                  return (
                    <div 
                      key={category.name}
                      onClick={() => handleCategorySelect(category.name)}
                      className={`group cursor-pointer rounded-2xl border transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden ${enhancement.border} bg-gradient-to-br ${enhancement.gradient} hover:shadow-${enhancement.color.split('-')[1]}-500/25`}
                    >
                      
                      {/* Image Cover */}
                      <div className="relative h-40 overflow-hidden">
                        <img 
                          src={enhancement.image} 
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextElementSibling.style.display = 'flex'
                          }}
                        />
                        {/* Fallback gradient if image fails */}
                        <div 
                          className={`w-full h-full hidden items-center justify-center bg-gradient-to-br ${enhancement.color}`}
                          style={{ display: 'none' }}
                        >
                          <div className="text-4xl text-white drop-shadow-lg">
                            {category.name === 'Food' ? '🍽️' :
                             category.name === 'Actions' ? '🏃' :
                             category.name === 'Family' ? '👨‍👩‍👧‍👦' :
                             category.name === 'Places' ? '🏢' :
                             category.name === 'Transportation' ? '🚗' :
                             category.name === 'Colors' ? '🌈' :
                             category.name === 'Numbers' ? '🔢' :
                             category.name === 'Time' ? '⏰' :
                             category.name === 'Body' ? '👤' :
                             category.name === 'Health' ? '🏥' :
                             category.name === 'Weather' ? '⛅' :
                             category.name === 'Clothing' ? '👕' :
                             category.name === 'Technology' ? '💻' :
                             category.name === 'Business' ? '💼' :
                             category.name === 'Education' ? '📚' :
                             category.name === 'Money' ? '💰' :
                             category.name === 'Emotions' ? '😊' :
                             category.name === 'Greetings' ? '👋' :
                             category.name === 'People' ? '👥' :
                             category.name === 'Leisure' ? '🎯' :
                             category.name === 'Descriptions' ? '📝' :
                             category.name === 'Important' ? '⭐' :
                             '📖'
                            }
                          </div>
                        </div>
                        
                        {/* Overlay gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${enhancement.color} opacity-80`}></div>
                        
                        {/* Category name overlay */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-lg font-bold text-white mb-1 drop-shadow-lg">
                            {category.name}
                          </h4>
                          <p className="text-sm text-white/90 font-medium">
                            {category.totalWords} words
                          </p>
                        </div>
                      </div>
                      
                      {/* Difficulty badges */}
                      <div className="p-4">
                        <div className="flex justify-center gap-2 flex-wrap mb-3">
                          {category.difficulties.Easy > 0 && (
                            <span className="text-xs px-2 py-1 bg-green-600/30 text-green-300 rounded-full border border-green-500/30">
                              {category.difficulties.Easy} Easy
                            </span>
                          )}
                          {category.difficulties.Medium > 0 && (
                            <span className="text-xs px-2 py-1 bg-yellow-600/30 text-yellow-300 rounded-full border border-yellow-500/30">
                              {category.difficulties.Medium} Medium
                            </span>
                          )}
                          {category.difficulties.Hard > 0 && (
                            <span className="text-xs px-2 py-1 bg-red-600/30 text-red-300 rounded-full border border-red-500/30">
                              {category.difficulties.Hard} Hard
                            </span>
                          )}
                        </div>
                        
                        {/* Click indicator */}
                        <div className="text-center">
                          <div className="text-white/60 text-sm font-medium group-hover:text-white transition-colors duration-300">
                            Click to explore →
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Category Words */}
      {activeCategory === 'words' && selectedWordCategory && (
        <div className="bg-gradient-to-br from-yellow-600/10 to-yellow-800/10 rounded-2xl border border-yellow-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 p-6 border-b border-yellow-400/20">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl flex items-center justify-center text-2xl">
                  📝
                </div>
                {selectedWordCategory} Words
              </h3>
              <button 
                onClick={() => {
                  setSelectedWordCategory(null)
                  setCategoryWords([])
                }} 
                className="text-yellow-300 hover:text-white"
              >
                ← Back to Categories
              </button>
            </div>
            <p className="text-yellow-200 mt-2">
              {categoryWords.length} essential {selectedWordCategory.toLowerCase()} words for daily communication
            </p>
          </div>
          
          <div className="p-6">
            {wordsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading words...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryWords.map((word) => (
                  <div 
                    key={word.id}
                    className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-yellow-400/50 transition-all duration-300 hover:bg-white/10"
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold text-white mb-1 group-hover:scale-105 transition-transform">
                        {word.english_word}
                      </div>
                      <div className="text-sm text-yellow-300 mb-2">
                        {word.somali_word}
                      </div>
                      {word.word_type && (
                        <div className="text-xs text-gray-400 mb-2 italic">
                          {word.word_type}
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          word.difficulty_level === 'Easy' ? 'bg-green-600/20 text-green-300' : 
                          word.difficulty_level === 'Medium' ? 'bg-yellow-600/20 text-yellow-300' :
                          'bg-red-600/20 text-red-300'
                        }`}>
                          {word.difficulty_level}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            playAudio && playAudio(word.english_word, word.english_word)
                          }}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors p-1 rounded-full hover:bg-yellow-400/10"
                          title={`Listen to "${word.english_word}"`}
                        >
                          🔊
                        </button>
                      </div>
                      {word.example_sentence_english && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="text-xs text-gray-300 mb-1">
                            "{word.example_sentence_english}"
                          </div>
                          {word.example_sentence_somali && (
                            <div className="text-xs text-yellow-200">
                              "{word.example_sentence_somali}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Practice Activities Section */}
      {activeCategory === 'practice' && (
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-800/10 rounded-2xl border border-purple-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 p-6 border-b border-purple-400/20">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center text-2xl">
                  🎮
                </div>
                Practice Activities
              </h3>
              <button onClick={() => setActiveCategory(null)} className="text-purple-300 hover:text-white">
                ← Back
              </button>
            </div>
            <p className="text-purple-200 mt-2">Interactive exercises to practice what you learned</p>
          </div>

          <div className="p-6">
            {/* Activity Selection */}
            {!currentPractice && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div 
                  onClick={() => {
                    clearShuffledOptions()
                    setCurrentPractice('fill_blank')
                  }}
                  className="group cursor-pointer rounded-2xl border border-blue-500/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-800/20 hover:shadow-blue-500/25"
                >
                  {/* Image Cover */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop&crop=center"
                      alt="Fill in the Blank"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextElementSibling.style.display = 'flex'
                      }}
                    />
                    {/* Fallback gradient if image fails */}
                    <div 
                      className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600"
                      style={{ display: 'none' }}
                    >
                      <div className="text-6xl text-white drop-shadow-lg">✏️</div>
                    </div>
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-indigo-600 opacity-80"></div>
                    
                    {/* Activity info overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">Fill in the Blank</h3>
                      <p className="text-sm text-white/90 font-medium">Complete missing letters</p>
                    </div>
                  </div>
                  
                  {/* Progress info */}
                  <div className="p-4 text-center">
                    <div className="text-blue-300 text-sm font-medium mb-2">
                      Highest Level: {userProgress.fill_blank.highest_level}
                    </div>
                    <div className="text-white/60 text-sm font-medium group-hover:text-white transition-colors duration-300">
                      Click to start →
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    clearShuffledOptions()
                    setCurrentPractice('word_matching')
                  }}
                  className="group cursor-pointer rounded-2xl border border-green-500/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden bg-gradient-to-br from-green-600/20 to-green-800/20 hover:shadow-green-500/25"
                >
                  {/* Image Cover */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop&crop=center"
                      alt="Word Matching"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextElementSibling.style.display = 'flex'
                      }}
                    />
                    {/* Fallback gradient if image fails */}
                    <div 
                      className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600"
                      style={{ display: 'none' }}
                    >
                      <div className="text-6xl text-white drop-shadow-lg">🔗</div>
                    </div>
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-green-500 to-emerald-600 opacity-80"></div>
                    
                    {/* Activity info overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">Word Matching</h3>
                      <p className="text-sm text-white/90 font-medium">Match English & Somali</p>
                    </div>
                  </div>
                  
                  {/* Progress info */}
                  <div className="p-4 text-center">
                    <div className="text-green-300 text-sm font-medium mb-2">
                      Highest Level: {userProgress.word_matching.highest_level}
                    </div>
                    <div className="text-white/60 text-sm font-medium group-hover:text-white transition-colors duration-300">
                      Click to start →
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    clearShuffledOptions()
                    setCurrentPractice('listen_choose')
                  }}
                  className="group cursor-pointer rounded-2xl border border-purple-500/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-800/20 hover:shadow-purple-500/25"
                >
                  {/* Image Cover */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center"
                      alt="Listen & Choose"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextElementSibling.style.display = 'flex'
                      }}
                    />
                    {/* Fallback gradient if image fails */}
                    <div 
                      className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600"
                      style={{ display: 'none' }}
                    >
                      <div className="text-6xl text-white drop-shadow-lg">🔊</div>
                    </div>
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-500 to-pink-600 opacity-80"></div>
                    
                    {/* Activity info overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">Listen & Choose</h3>
                      <p className="text-sm text-white/90 font-medium">Listen & choose spelling</p>
                    </div>
                  </div>
                  
                  {/* Progress info */}
                  <div className="p-4 text-center">
                    <div className="text-purple-300 text-sm font-medium mb-2">
                      Highest Level: {userProgress.listen_choose.highest_level}
                    </div>
                    <div className="text-white/60 text-sm font-medium group-hover:text-white transition-colors duration-300">
                      Click to start →
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Level Selection & Activity Content */}
            {currentPractice && (
              <div className="space-y-6">
                
                {/* Back Button & Level Selection */}
                <div className="flex items-center justify-between mb-6">
                  <button 
                    onClick={() => {
                      setCurrentPractice(null)
                      setCurrentActivity(null)
                      setShowResults(false)
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    ← Back to Activities
                  </button>
                  
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({length: 12}, (_, i) => i + 1).map(level => (
                      <button
                        key={level}
                        onClick={() => setPracticeLevel(level)}
                        disabled={level > userProgress[currentPractice].highest_level}
                        className={`px-3 py-1 rounded-lg font-medium transition-all text-sm ${
                          practiceLevel === level 
                            ? 'bg-blue-600 text-white' 
                            : level <= userProgress[currentPractice].highest_level
                              ? 'bg-blue-800 text-blue-300 hover:bg-blue-700'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-300 mt-4">Loading activity...</p>
                  </div>
                )}

                {/* Activity Content */}
                {!loading && currentActivity && !showResults && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-white mb-2">{currentActivity.title}</h2>
                      <p className="text-gray-300">{currentActivity.description}</p>
                      <p className="text-sm text-blue-300 mt-2">{currentActivity.content.instructions}</p>
                    </div>

                    {/* Fill in the Blank Activity */}
                    {currentPractice === 'fill_blank' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {currentActivity.content.questions.map((question, index) => (
                          <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="text-center">
                              <div className="text-xl font-bold text-white mb-2">{question.english}</div>
                              <div className="text-green-300 mb-4">{question.somali}</div>
                              <input 
                                type="text" 
                                value={userAnswers[index] || ''}
                                onChange={(e) => handleFillBlankAnswer(index, e.target.value)}
                                className="bg-gray-700 text-white px-4 py-2 rounded-lg text-center text-lg font-bold uppercase w-24"
                                maxLength={question.answer.length}
                                placeholder="?"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Word Matching Activity */}
                    {currentPractice === 'word_matching' && (
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
                          <div className="space-y-3">
                            <h5 className="text-lg font-bold text-blue-300 text-center">English Words</h5>
                            {shuffledEnglish.map((word) => {
                              const isSelected = selectedWord === word
                              const isMatched = matchedPairs.some(pair => pair.english === word)
                              return (
                                <button 
                                  key={word}
                                  onClick={() => !isMatched && handleWordMatch(word, true)}
                                  disabled={isMatched}
                                  className={`w-full p-4 rounded-xl font-semibold transition-all duration-300 ${
                                    isMatched
                                      ? 'bg-green-600 text-white shadow-lg opacity-75 cursor-not-allowed'
                                      : isSelected
                                        ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-300'
                                        : 'bg-white/5 text-white hover:bg-white/10 border-2 border-transparent'
                                  }`}
                                >
                                  {word}
                                </button>
                              )
                            })}
                          </div>
                          
                          <div className="space-y-3">
                            <h5 className="text-lg font-bold text-green-300 text-center">Somali Words</h5>
                            {shuffledSomali.map((word) => {
                              const isMatched = matchedPairs.some(pair => pair.somali === word)
                              return (
                                <button 
                                  key={word}
                                  onClick={() => !isMatched && handleWordMatch(word, false)}
                                  disabled={isMatched || !selectedWord}
                                  className={`w-full p-4 rounded-xl font-semibold transition-all duration-300 ${
                                    isMatched
                                      ? 'bg-green-600 text-white shadow-lg opacity-75 cursor-not-allowed'
                                      : selectedWord
                                        ? 'bg-gray-600/50 text-white hover:bg-gray-600/70 border-2 border-gray-400'
                                        : 'bg-white/5 text-white border-2 border-transparent opacity-50'
                                  }`}
                                >
                                  {word}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        
                        {/* Matched Pairs Display */}
                        {matchedPairs.length > 0 && (
                          <div className="bg-green-600/20 rounded-xl p-4 border border-green-500/30">
                            <h6 className="text-green-300 font-bold mb-2">Matched Pairs:</h6>
                            <div className="flex flex-wrap gap-2">
                              {matchedPairs.map((match, index) => (
                                <div key={index} className="flex items-center gap-2 bg-green-600/30 rounded-lg px-3 py-1">
                                  <span className="text-white">{match.english} → {match.somali}</span>
                                  <button 
                                    onClick={() => removeMatch(index)}
                                    className="text-red-300 hover:text-red-100 ml-2"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Listen & Choose Activity */}
                    {currentPractice === 'listen_choose' && (
                      <div className="space-y-6">
                        {!shuffledListenOptions[0] ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                            <p className="text-gray-300">Preparing audio options...</p>
                          </div>
                        ) : (
                          currentActivity.content.questions.map((question, index) => (
                            <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                              <div className="text-center mb-4">
                                <button 
                                  onClick={() => playAudio && playAudio(question.audio_text, question.audio_text)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                                >
                                  🔊 Play Audio
                                </button>
                                <div className="text-green-300 mt-2">{question.somali_meaning}</div>
                              </div>
                              
                              <div className={`grid gap-3 ${question.options.length > 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                                {shuffledListenOptions[index]?.map((option) => (
                                  <button 
                                    key={`${practiceLevel}-${index}-${option}`}
                                    onClick={() => handleListenAnswer(index, option)}
                                    className={`p-4 rounded-xl font-semibold transition-all duration-300 ${
                                      userAnswers[index] === option
                                        ? 'bg-purple-600 text-white shadow-lg border-2 border-purple-300'
                                        : 'bg-white/5 text-white hover:bg-white/10 border-2 border-transparent hover:border-purple-400/30'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="text-center mt-8">
                      <button 
                        onClick={submitLevel}
                        disabled={!canSubmitLevel()}
                        className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
                          canSubmitLevel()
                            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Submit Level
                      </button>
                      <p className="text-gray-400 text-sm mt-2">
                        {currentPractice === 'word_matching' 
                          ? `Match all ${getTotalQuestions()} pairs to submit`
                          : `Answer all ${getTotalQuestions()} questions to submit`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Results Display */}
                {showResults && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
                    <h3 className="text-2xl font-bold text-white mb-4">Level {practiceLevel} Results</h3>
                    <div className={`text-6xl font-bold mb-4 ${levelScore >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                      {levelScore}%
                    </div>
                    <div className={`text-xl mb-6 ${levelScore >= 80 ? 'text-green-300' : 'text-red-300'}`}>
                      {levelScore >= 80 ? '🎉 Excellent! Level Passed!' : '😔 Keep practicing! Try again.'}
                    </div>
                    {levelScore >= 80 && practiceLevel < 12 && (
                      <p className="text-blue-300 mb-4">Advancing to Level {practiceLevel + 1} in 3 seconds...</p>
                    )}
                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={() => {
                          setShowResults(false)
                          setUserAnswers([])
                          setMatchedPairs([])
                          setSelectedWord(null)
                          fetchActivities(currentPractice, practiceLevel)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                      >
                        Try Again
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentPractice(null)
                          setCurrentActivity(null)
                          setShowResults(false)
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
                      >
                        Back to Menu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
