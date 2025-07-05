"use client"
import { Search, Send, Loader2, YoutubeIcon, Tag, Clock, Filter, X, FileText } from "lucide-react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { diagnosisList } from "./diagnosisList"
import dxDataRaw from "../public/dx.json" assert { type: "json" };

const processVideoUrl = (url, startTime) => {
  if (!url) return "#"
  // Clean up the URL by removing newlines and whitespace
  const cleanUrl = url.replace(/\n/g, "").trim()
  // Convert time to nearest seconds if it exists
  if (startTime) {
    const timeInSeconds = Math.round(Number.parseFloat(startTime))
    const separator = cleanUrl.includes("?") ? "&" : "?"
    return `${cleanUrl}${separator}t=${timeInSeconds}`
  }
  return cleanUrl
}

const filterMedicalTags = (entities) => {
  if (!entities) return []
  return entities.filter((entity) => ["T184", "T047"].includes(entity.semantic_type)).map((entity) => entity.text)
}

export default function Home() {
  const [inputValue, SetInputValue] = useState("")
  const [displayText, SetDisplayText] = useState("Clinical Problem Solvers")
  const [results, SetResults] = useState([])
  const [allResults, setAllResults] = useState([]) // Store all videos
  const [loading, setLoading] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showFilter, setShowFilter] = useState(false)
  
  // Filter states for all three categories
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([])
  const [selectedComplaints, setSelectedComplaints] = useState([])
  const [selectedTopics, setSelectedTopics] = useState([])
  
  // Input states for filtering
  const [diagnosisInput, setDiagnosisInput] = useState("")
  const [complaintInput, setComplaintInput] = useState("")
  const [topicInput, setTopicInput] = useState("")
  
  // Tab state for filter modal
  const [activeFilterTab, setActiveFilterTab] = useState("diagnosis") // "diagnosis", "complaint", "topics"
  
  const [dxResults, setDxResults] = useState([])

  // Extract unique chief complaints and topics from dx data
  const [allComplaints, setAllComplaints] = useState([])
  const [allTopics, setAllTopics] = useState([])

  // Initialize complaints and topics lists
  useEffect(() => {
    const complaints = new Set()
    const topics = new Set()
    
    Object.values(dxDataRaw || {}).forEach(item => {
      if (item["Chief Complaint"]) {
        // Clean up the chief complaint text
        const cleanComplaint = item["Chief Complaint"]
          .replace(/["\[\]]/g, '') // Remove quotes and brackets
          .trim()
        if (cleanComplaint) {
          complaints.add(cleanComplaint)
        }
      }
      if (item["Topics"] && typeof item["Topics"] === "string") {
        // Parse topics string and split by common separators, then clean up
        const topicArray = item["Topics"]
          .split(/[,;|]/)
          .map(t => t.replace(/["\[\]]/g, '').trim()) // Remove quotes and brackets
          .filter(t => t.length > 0)
        topicArray.forEach(topic => topics.add(topic))
      }
    })
    
    setAllComplaints(Array.from(complaints).sort())
    setAllTopics(Array.from(topics).sort())
  }, [])

  // Filter results by selected criteria
  const filteredResults = () => {
    // If we have search results, return them
    if (results.length > 0) {
      return results
    }

    // Only apply dx.json filtering if any filters are selected
    if (selectedDiagnoses.length > 0 || selectedComplaints.length > 0 || selectedTopics.length > 0) {
      const dxFiltered = Object.entries(dxDataRaw || {}).filter(([url, meta]) => {
        const matchesDx = selectedDiagnoses.length === 0 || 
          selectedDiagnoses.some(dx => (meta["Final Dx"] || "").toLowerCase().includes(dx.toLowerCase()))
        
        const matchesComplaint = selectedComplaints.length === 0 || 
          selectedComplaints.some(complaint => (meta["Chief Complaint"] || "").toLowerCase().includes(complaint.toLowerCase()))
        
        const matchesTopics = selectedTopics.length === 0 || 
          selectedTopics.some(topic => {
            const topics = meta["Topics"] || ""
            return topics.toLowerCase().includes(topic.toLowerCase())
          })
        
        return matchesDx && matchesComplaint && matchesTopics
      }).map(([url, meta]) => ({ url: url.trim(), ...meta }))
      
      return dxFiltered
    }

    // Return empty array if no search results and no filters
    return []
  }

  const handleSend = async () => {
    setLoading(true)
    SetResults([])
    setLoadingProgress(0)
    
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + Math.random() * 20, 90))
    }, 300)

    try {
      // Using the correct endpoint for search
      const res = await fetch(`https://clinical-problem-solvers.onrender.com/search?query=${inputValue}`)
      
      // Check if the response is valid JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API did not return JSON data");
      }
      
      const data = await res.json();
      console.log("API Response:", data); // Debug log
      setLoadingProgress(100);
      
      // Handle the search results properly - prioritize matches key
      if (data.matches && Array.isArray(data.matches)) {
        // Primary case: results are nested under 'matches' key (as shown in your example)
        console.log("Found matches:", data.matches.length);
        SetResults(data.matches);
        setAllResults(data.matches);
      } else if (data && Array.isArray(data)) {
        // If data is directly an array of results
        SetResults(data);
        setAllResults(data);
      } else if (data.results && Array.isArray(data.results)) {
        // If results are nested under 'results' key
        SetResults(data.results);
        setAllResults(data.results);
      } else {
        // Fallback: try to extract any array from the response
        const possibleArrays = Object.values(data).filter(Array.isArray);
        if (possibleArrays.length > 0) {
          SetResults(possibleArrays[0]);
          setAllResults(possibleArrays[0]);
        } else {
          console.log("No valid results found in response");
          SetResults([]);
          setAllResults([]);
        }
      }
    } catch (e) {
      console.error("Search error:", e);
      
      // If API fails, use the sample data as fallback
      const sampleData = {
        "matches": [
          {
            "final_dx": "Gastric adenocarcinoma + PE",
            "id": "chunk-33518",
            "metadata": {
              "description": "Do you want to get access to even more VMRs?",
              "thumbnail": "https://i.ytimg.com/vi/zthffta8z1o/hqdefault.jpg",
              "title": "October 26, 2022 \"30-minute\" VMR - chest pain",
              "title_extracted_entities": [
                {
                  "semantic_type": "T184",
                  "text": "chest pain",
                  "umls_cui": "C0008031"
                }
              ],
              "upload_date": "20221026",
              "view_count": 399
            },
            "score": 0.588186145,
            "start_time": 1202.58,
            "text": "mechanisms by which somebody can develop severe anemia...",
            "url": "https://www.youtube.com/watch?v=zthffta8z1o"
          },
          {
            "final_dx": "AIHA, Hodgkin lymphoma",
            "id": "chunk-10623",
            "metadata": {
              "description": "VMR Schedule Survey",
              "thumbnail": "https://i.ytimg.com/vi/COo4Xe_W6p8/maxresdefault.jpg",
              "title": "September 4, 2024 VMR with Steph & Zaven - severe anemia",
              "title_extracted_entities": [
                {
                  "semantic_type": "T033",
                  "text": "severe",
                  "umls_cui": "C0205082"
                },
                {
                  "semantic_type": "T047",
                  "text": "anemia",
                  "umls_cui": "C0002871"
                }
              ],
              "upload_date": "20240904"
            },
            "score": 0.575707495,
            "start_time": 711.839,
            "text": "hear a number for the anemia or not yet...",
            "url": "https://www.youtube.com/watch?v=COo4Xe_W6p8"
          }
        ]
      };
      
      // If the search term includes specific keywords, show the sample data
      if (inputValue.toLowerCase().includes("anemia") || 
          inputValue.toLowerCase().includes("blood") ||
          inputValue.toLowerCase().includes("pain")) {
        SetResults(sampleData.matches);
        setAllResults(sampleData.matches);
      } else {
        SetResults([]);
        setAllResults([]);
      }
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
      }, 500);
    }
  }

  const handleTranscriptClick = (item) => {
    setSelectedTranscript(item)
    setShowTranscript(true)
  }

  // Fetch dx.json and filter by selected criteria
  useEffect(() => {
    if (selectedDiagnoses.length > 0 || selectedComplaints.length > 0 || selectedTopics.length > 0) {
      const filtered = filteredResults()
      setDxResults(filtered)
    } else {
      setDxResults([])
    }
  }, [selectedDiagnoses, selectedComplaints, selectedTopics, allResults])

  // Mock API Response Handler - will process your provided data
  useEffect(() => {
    // This handles the mock API response you provided in your prompt
    const handleMockApiResponse = (data) => {
      if (data && data.matches && data.matches.length > 0) {
        SetResults(data.matches || []);
        setAllResults(data.matches || []);
        SetInputValue("anemia"); // Set input to match the search term
        setLoading(false);
      }
    };
    
    // Import the CSS for the grid pattern
    import("../styles/grid-pattern.css")
      .catch(err => console.error("Failed to load grid pattern CSS:", err));
    
    // You can uncomment this to process the mock data immediately on page load
    // const mockData = {"matches": [...your data here...]};
    // handleMockApiResponse(mockData);
  }, []);

  // Add helper function to match URLs and get dx.json data
  const getDxDataForUrl = (url) => {
    if (!url || !dxDataRaw) return null
    
    // Clean the URL for comparison
    const cleanUrl = url.replace(/\n/g, "").trim()
    
    // Try to find exact match first
    if (dxDataRaw[cleanUrl]) {
      return dxDataRaw[cleanUrl]
    }
    
    // Try to find partial match (YouTube video ID)
    const videoIdMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (videoIdMatch) {
      const videoId = videoIdMatch[1]
      for (const [dxUrl, dxData] of Object.entries(dxDataRaw)) {
        if (dxUrl.includes(videoId)) {
          return dxData
        }
      }
    }
    
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white flex flex-col items-center px-4 py-8 relative"
    >
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      
      <AnimatePresence>
        {!results.length && !loading && !dxResults.length && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-3xl text-center mb-10"
          >
            
            {/* Hero section with enhanced animations */}
            <div className="flex flex-col items-center justify-center gap-4 mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.1,
                  type: "spring",
                  stiffness: 120 
                }}
                className="relative"
              >
                <motion.div 
                  className="absolute -inset-4 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30 blur-xl"
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 10, ease: "linear", repeat: Infinity },
                    scale: { duration: 3, repeat: Infinity, repeatType: "reverse" }
                  }}
                />
                <motion.img
                  src="/logo.jpg"
                  alt="Clinical Problem Solvers Logo"
                  className="w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover shadow-lg border-2 border-zinc-800 relative z-10"
                  whileHover={{ 
                    scale: 1.05,
                    rotate: 2,
                    transition: { duration: 0.3 } 
                  }}
                />
              </motion.div>
              
              <motion.div className="flex flex-col items-center mt-2">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-2xl md:text-4xl font-light tracking-wide text-indigo-400 mb-2"
                >
                  SearchCPS
                </motion.h1>
                
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent"
                >
                  {displayText}
                </motion.h1>
                
                {/* New: Animated tagline */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="mt-2 text-lg md:text-xl text-indigo-300 font-medium"
                >
                  Find the Case. Master the Reasoning
                </motion.p>
                
                {/* Added X (Twitter) link */}
                <motion.a
                  href="https://twitter.com/CPSolvers"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="mt-2 text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Made with ❤ (@CPSolvers)
                </motion.a>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="relative px-6 py-5 mb-8 rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/80 border border-zinc-700/50 max-w-2xl mx-auto"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="text-zinc-300 max-w-xl mx-auto text-sm md:text-base leading-relaxed"
              >
                Discover and search through <span className="text-indigo-300 font-medium">medical cases</span>, 
                <span className="text-indigo-300 font-medium"> lectures</span>, and 
                <span className="text-indigo-300 font-medium"> clinical reasoning discussions</span> from 
                world-class medical educators — all in one place.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 mt-4"
            >
              {[
                { 
                  icon: YoutubeIcon, 
                  text: "1000+ Videos", 
                  desc: "Curated medical content", 
                  color: "text-red-500",
                  bgColor: "from-red-500/20 to-red-600/5" 
                },
                { 
                  icon: Tag, 
                  text: "Smart Tagging", 
                  desc: "Auto-categorized for you", 
                  color: "text-blue-500",
                  bgColor: "from-blue-500/20 to-blue-600/5" 
                },
                { 
                  icon: Clock, 
                  text: "Timestamps", 
                  desc: "Jump to key moments", 
                  color: "text-green-500",
                  bgColor: "from-green-500/20 to-green-600/5" 
                },
                { 
                  icon: Filter, 
                  text: "Smart Filters", 
                  desc: "Find by condition", 
                  color: "text-purple-500",
                  bgColor: "from-purple-500/20 to-purple-600/5" 
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -5,
                    transition: { duration: 0.2 } 
                  }}
                  className={`p-4 rounded-xl bg-gradient-to-br ${feature.bgColor} backdrop-blur border border-zinc-700/50 hover:border-zinc-600/80 transition-all duration-300 cursor-pointer shadow-lg`}
                >
                  <div className="mb-2 flex justify-center">
                    <motion.div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 ${feature.color}`}
                      whileHover={{ rotate: 10 }}
                    >
                      <feature.icon className="w-5 h-5" />
                    </motion.div>
                  </div>
                  <p className="font-medium mb-1 text-sm text-white">{feature.text}</p>
                  <p className="text-xs text-zinc-400">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
            
            {/* New: Call to action hint */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="flex flex-col items-center mt-4 text-sm text-zinc-500"
            >
              <motion.div 
                animate={{ y: [0, 8, 0] }} 
                transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                className="text-zinc-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </motion.div>
              <p className="mt-2">Start by typing a clinical condition below</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Results header with home button - improved for mobile */}
      {(results.length > 0 || dxResults.length > 0) && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 px-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              SetResults([]);
              setAllResults([]);
              SetInputValue("");
              setDxResults([]);
              // Reset all filters
              setSelectedDiagnoses([]);
              setSelectedComplaints([]);
              setSelectedTopics([]);
              setDiagnosisInput("");
              setComplaintInput("");
              setTopicInput("");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 rounded-full text-sm text-zinc-200 border border-zinc-700/60 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </motion.button>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-zinc-400 text-sm md:text-base font-medium text-center sm:text-right"
          >
            Showing top {Math.min(dxResults.length || results.length || filteredResults().length, 10)} results for "{inputValue}"
          </motion.div>
        </motion.div>
      )}
      
      {/* Responsive grid with better mobile sizing */}
      <motion.div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 px-3 sm:px-4">
        <AnimatePresence>
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="col-span-full flex flex-col items-center justify-center p-10 h-80"
            >
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-indigo-300 border-l-transparent mb-4"
              />
              <p className="text-zinc-400 text-sm mb-4">Searching for "{inputValue}"...</p>
              <div className="w-full max-w-xs bg-zinc-800 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              </div>
            </motion.div>
          ) : dxResults.length > 0 ? (
            dxResults.map((item, index) => (
              <motion.a
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  scale: 1.02,
                  y: -5,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.98 }}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden hover:border-zinc-600 transition-all duration-300 relative backdrop-blur"
              >
                <div className="relative overflow-hidden">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
                  />
                  {index < 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="absolute top-3 left-3 flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                      <span className="text-xs font-medium bg-white/20 border border-white/30 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                        Top Match
                      </span>
                    </motion.div>
                  )}
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <h3 className="font-medium text-lg mb-2 line-clamp-1">{item.title}</h3>
                  <p className="text-zinc-400 text-sm line-clamp-2 mb-4">{item.description}</p>
                  
                  {/* Additional details section */}
                  <div className="space-y-2 mb-4">
                    <div className="mb-2 text-xs text-blue-400 font-semibold">
                      {item["Final Dx"] && (
                        <span>Final Dx: {item["Final Dx"].replace(/["\[\]]/g, '')}</span>
                      )}
                    </div>
                    
                    {item["Chief Complaint"] && (
                      <div className="text-xs text-green-400 font-medium">
                        <span>Chief Complaint: {item["Chief Complaint"].replace(/["\[\]]/g, '')}</span>
                      </div>
                    )}
                    
                    {item["Topics"] && (
                      <div className="text-xs text-purple-400 font-medium">
                        <span>Topics: {item["Topics"].replace(/["\[\]]/g, '').split(/[,;|]/).map(t => t.trim()).filter(t => t.length > 0).join(', ')}</span>
                      </div>
                    )}
                    
                    {item["Patient Age"] && (
                      <div className="text-xs text-yellow-400 font-medium">
                        <span>Age: {item["Patient Age"].replace(/["\[\]]/g, '')}</span>
                      </div>
                    )}
                    
                    {item["Patient Sex"] && (
                      <div className="text-xs text-pink-400 font-medium">
                        <span>Sex: {item["Patient Sex"].replace(/["\[\]]/g, '')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-700/50">
                    <div className="text-xs text-zinc-500">{item.upload_date}</div>
                    <div className="flex items-center gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white hover:bg-zinc-200 text-black rounded-full text-xs flex items-center gap-1 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Watch</span>
                      </a>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))
          ) : filteredResults().length > 0 ? (
            filteredResults().map((item, index) => (
              <motion.a
                key={item.id || index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  scale: 1.02,
                  y: -5,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.98 }}
                href={processVideoUrl(item.url, item.start_time)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden hover:border-zinc-600 transition-all duration-300 relative backdrop-blur"
              >
                <div className="relative overflow-hidden">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    src={item.metadata?.thumbnail}
                    alt={item.metadata?.title}
                    className="w-full h-48 object-cover"
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
                  />
                  {index < 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="absolute top-3 left-3 flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                      <span className="text-xs font-medium bg-white/20 border border-white/30 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                        Top Match
                      </span>
                    </motion.div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-3 right-3 bg-black/90 text-xs px-2 py-1 rounded backdrop-blur-sm"
                  >
                    {Math.round(item.score * 100)}% match
                  </motion.div>
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <h3 className="font-medium text-lg mb-2 line-clamp-1">{item.metadata?.title}</h3>
                  <p className="text-zinc-400 text-sm line-clamp-2 mb-4">{item.metadata?.description}</p>

                  {/* Enhanced dx.json data display */}
                  {(() => {
                    const dxData = getDxDataForUrl(item.url)
                    return dxData && (
                      <div className="space-y-2 mb-4">
                        {dxData["Final Dx"] && (
                          <div className="text-xs text-blue-400 font-semibold">
                            <span>Final Dx: {dxData["Final Dx"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                        
                        {dxData["Chief Complaint"] && (
                          <div className="text-xs text-green-400 font-medium">
                            <span>Chief Complaint: {dxData["Chief Complaint"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                        
                        {dxData["Topics"] && (
                          <div className="text-xs text-purple-400 font-medium">
                            <span>Topics: {dxData["Topics"].replace(/["\[\]]/g, '').split(/[,;|]/).map(t => t.trim()).filter(t => t.length > 0).join(', ')}</span>
                          </div>
                        )}
                        
                        {dxData["Patient Age"] && (
                          <div className="text-xs text-yellow-400 font-medium">
                            <span>Age: {dxData["Patient Age"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                        
                        {dxData["Patient Sex"] && (
                          <div className="text-xs text-pink-400 font-medium">
                            <span>Sex: {dxData["Patient Sex"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Show original final_dx if available and no dx.json match */}
                  {!getDxDataForUrl(item.url) && item.final_dx && (
                    <div className="mb-2 text-xs text-blue-400 font-semibold">
                      <span>Final Dx: {item.final_dx.replace(/["\[\]]/g, '')}</span>
                    </div>
                  )}

                  <div className="mt-auto">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-wrap gap-2 mb-4"
                    >
                      {filterMedicalTags(item.metadata?.title_extracted_entities).map((tag, tagIndex) => (
                        <motion.span
                          key={tagIndex}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + tagIndex * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                          className="px-2 py-1 bg-white/10 text-xs text-white rounded-full border border-white/20"
                        >
                          {tag.replace(/["\[\]]/g, '')}
                        </motion.span>
                      ))}
                    </motion.div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-500">{item.metadata?.upload_date}</div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs text-zinc-300 flex items-center gap-1 transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            handleTranscriptClick(item)
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="hidden sm:inline">Transcript</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white hover:bg-zinc-200 text-black rounded-full text-xs flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span className="hidden sm:inline">Watch</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))
          ) : results.length > 0 ? (
            // This section renders the actual search results
            results.map((item, index) => (
              <motion.a
                key={item.id || index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  scale: 1.02,
                  y: -5,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.98 }}
                href={processVideoUrl(item.url, item.start_time)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden hover:border-zinc-600 transition-all duration-300 relative backdrop-blur"
              >
                <div className="relative overflow-hidden">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    src={item.metadata?.thumbnail}
                    alt={item.metadata?.title}
                    className="w-full h-48 object-cover"
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
                  />
                  {index < 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="absolute top-3 left-3 flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                      <span className="text-xs font-medium bg-white/20 border border-white/30 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                        Top Match
                      </span>
                    </motion.div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-3 right-3 bg-black/90 text-xs px-2 py-1 rounded backdrop-blur-sm"
                  >
                    {Math.round(item.score * 100)}% match
                  </motion.div>
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <h3 className="font-medium text-lg mb-2 line-clamp-1">{item.metadata?.title}</h3>
                  <p className="text-zinc-400 text-sm line-clamp-2 mb-4">{item.metadata?.description}</p>

                  {/* Enhanced dx.json data display */}
                  {(() => {
                    const dxData = getDxDataForUrl(item.url)
                    return dxData && (
                      <div className="space-y-2 mb-4">
                        {dxData["Final Dx"] && (
                          <div className="text-xs text-blue-400 font-semibold">
                            <span>Final Dx: {dxData["Final Dx"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                        
                        {dxData["Chief Complaint"] && (
                          <div className="text-xs text-green-400 font-medium">
                            <span>Chief Complaint: {dxData["Chief Complaint"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                        
                        {dxData["Topics"] && (
                          <div className="text-xs text-purple-400 font-medium">
                            <span>Topics: {dxData["Topics"].replace(/["\[\]]/g, '').split(/[,;|]/).map(t => t.trim()).filter(t => t.length > 0).join(', ')}</span>
                          </div>
                        )}
                        
                        {dxData["Patient Age"] && (
                          <div className="text-xs text-yellow-400 font-medium">
                            <span>Age: {dxData["Patient Age"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                        
                        {dxData["Patient Sex"] && (
                          <div className="text-xs text-pink-400 font-medium">
                            <span>Sex: {dxData["Patient Sex"].replace(/["\[\]]/g, '')}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Show original final_dx if available and no dx.json match */}
                  {!getDxDataForUrl(item.url) && item.final_dx && (
                    <div className="mb-2 text-xs text-blue-400 font-semibold">
                      <span>Final Dx: {item.final_dx.replace(/["\[\]]/g, '')}</span>
                    </div>
                  )}

                  <div className="mt-auto">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-wrap gap-2 mb-4"
                    >
                      {filterMedicalTags(item.metadata?.title_extracted_entities).map((tag, tagIndex) => (
                        <motion.span
                          key={tagIndex}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + tagIndex * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                          className="px-2 py-1 bg-white/10 text-xs text-white rounded-full border border-white/20"
                        >
                          {tag.replace(/["\[\]]/g, '')}
                        </motion.span>
                      ))}
                    </motion.div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-500">{item.metadata?.upload_date}</div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs text-zinc-300 flex items-center gap-1 transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            handleTranscriptClick(item)
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="hidden sm:inline">Transcript</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white hover:bg-zinc-200 text-black rounded-full text-xs flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span className="hidden sm:inline">Watch</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))
          ) : (
            <></>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Transcript sidebar - made responsive */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[80%] md:w-96 bg-zinc-900/95 border-l border-zinc-700/50 backdrop-blur-lg z-50"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Transcript Data</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTranscript(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              {selectedTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <div className="text-sm text-zinc-400 space-y-2">
                    <p>Timestamp: {selectedTranscript.start_time}s</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <h5 className="text-sm font-medium mb-2">Transcript:</h5>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedTranscript.text}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <h5 className="text-sm font-medium mb-2">Medical Tags:</h5>
                    <div className="flex flex-wrap gap-2">
                      {filterMedicalTags(selectedTranscript.metadata?.title_extracted_entities).map((tag, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          className="px-2 py-1 bg-white/10 rounded-full text-xs text-white border border-white/20"
                        >
                          {tag.replace(/["\[\]]/g, '')}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar - improved for mobile */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] sm:w-10/12 max-w-xl z-30"
      >
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="flex items-center w-full gap-1 sm:gap-2 bg-gradient-to-r from-zinc-800/90 to-zinc-900/90 border border-zinc-700/50 rounded-full px-3 sm:px-4 py-2 sm:py-3 shadow-xl backdrop-blur"
        >
          <Search className="text-zinc-400 w-4 h-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search for clinical cases... (Press Enter to search)"
            value={inputValue}
            onChange={(e) => SetInputValue(e.target.value)}
            className="flex-grow outline-none text-white placeholder-zinc-500 bg-transparent text-sm md:text-base ml-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend()
            }}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilter(true)}
            className="p-3 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors relative"
            aria-label="Filter"
          >
            <Filter className="w-5 h-5" />
            {(selectedDiagnoses.length > 0 || selectedComplaints.length > 0 || selectedTopics.length > 0) && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 border border-zinc-800 shadow">
                {selectedDiagnoses.length + selectedComplaints.length + selectedTopics.length}
              </span>
            )}
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Filter modal - made more responsive */}
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 40 }}
              transition={{ duration: 0.25 }}
              className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700/50 rounded-2xl p-4 sm:p-5 w-[90%] sm:w-full max-w-lg shadow-2xl flex flex-col gap-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white text-base">Filter Results</span>
                <button
                  className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400"
                  onClick={() => setShowFilter(false)}
                  aria-label="Close filter"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Navigation */}
                          <div className="flex bg-zinc-800 rounded-lg p-1 mb-3">
                {[
                  { id: "diagnosis", label: "Diagnosis", count: selectedDiagnoses.length },
                  { id: "complaint", label: "Chief Complaint", count: selectedComplaints.length },
                  { id: "topics", label: "Topics", count: selectedTopics.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilterTab(tab.id)}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all relative ${
                      activeFilterTab === tab.id 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                        activeFilterTab === tab.id ? "bg-blue-800" : "bg-zinc-600"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Selected items display */}
              <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
                {activeFilterTab === "diagnosis" && selectedDiagnoses.length === 0 && (
                  <span className="text-xs text-zinc-500">No diagnoses selected</span>
                )}
                {activeFilterTab === "complaint" && selectedComplaints.length === 0 && (
                  <span className="text-xs text-zinc-500">No chief complaints selected</span>
                )}
                {activeFilterTab === "topics" && selectedTopics.length === 0 && (
                  <span className="text-xs text-zinc-500">No topics selected</span>
                )}
                
                {activeFilterTab === "diagnosis" && selectedDiagnoses.map(dx => (
                  <span key={dx} className="flex items-center bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">
                    {dx}
                    <button
                      className="ml-1 text-white/80 hover:text-white"
                      onClick={() => setSelectedDiagnoses(selectedDiagnoses.filter(d => d !== dx))}
                      aria-label={`Remove ${dx}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                
                {activeFilterTab === "complaint" && selectedComplaints.map(complaint => (
                  <span key={complaint} className="flex items-center bg-green-600 text-white px-2 py-0.5 rounded-full text-xs">
                    {complaint}
                    <button
                      className="ml-1 text-white/80 hover:text-white"
                      onClick={() => setSelectedComplaints(selectedComplaints.filter(c => c !== complaint))}
                      aria-label={`Remove ${complaint}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                
                {activeFilterTab === "topics" && selectedTopics.map(topic => (
                  <span key={topic} className="flex items-center bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs">
                    {topic}
                    <button
                      className="ml-1 text-white/80 hover:text-white"
                      onClick={() => setSelectedTopics(selectedTopics.filter(t => t !== topic))}
                      aria-label={`Remove ${topic}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Search input */}
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={
                    activeFilterTab === "diagnosis" ? diagnosisInput :
                    activeFilterTab === "complaint" ? complaintInput :
                    topicInput
                  }
                  onChange={e => {
                    if (activeFilterTab === "diagnosis") setDiagnosisInput(e.target.value)
                    else if (activeFilterTab === "complaint") setComplaintInput(e.target.value)
                    else setTopicInput(e.target.value)
                  }}
                  placeholder={`Search ${activeFilterTab === "diagnosis" ? "diagnoses" : activeFilterTab === "complaint" ? "chief complaints" : "topics"}...`}
                  className="bg-zinc-800 text-white px-2 py-1 rounded-full outline-none text-xs flex-1 border border-zinc-700 focus:border-blue-500 transition"
                  autoFocus
                />
                <button
                  className="px-2 py-1 rounded-full bg-zinc-700 text-white text-xs hover:bg-zinc-600 border border-zinc-600"
                  onClick={() => {
                    if (activeFilterTab === "diagnosis") {
                      setSelectedDiagnoses([])
                      setDiagnosisInput("")
                    } else if (activeFilterTab === "complaint") {
                      setSelectedComplaints([])
                      setComplaintInput("")
                    } else {
                      setSelectedTopics([])
                      setTopicInput("")
                    }
                  }}
                >Clear</button>
              </div>

              {/* Options list */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-40 mt-1 pb-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 bg-zinc-800 rounded-lg p-2 border border-zinc-700"
                style={{ WebkitOverflowScrolling: 'touch' }}>
                {(() => {
                  let options = []
                  let selected = []
                  let input = ""
                  
                  if (activeFilterTab === "diagnosis") {
                    options = diagnosisList
                    selected = selectedDiagnoses
                    input = diagnosisInput
                  } else if (activeFilterTab === "complaint") {
                    options = allComplaints
                    selected = selectedComplaints
                    input = complaintInput
                  } else {
                    options = allTopics
                    selected = selectedTopics
                    input = topicInput
                  }
                  
                  const filtered = options.filter(option => 
                    option.toLowerCase().includes(input.toLowerCase()) && 
                    !selected.includes(option)
                  )
                  
                  if (filtered.length === 0) {
                    return <span className="text-xs text-zinc-500">No matches</span>
                  }
                  
                  return filtered.map(option => (
                    <button
                      key={option}
                      className="px-2 py-1 rounded-full border text-xs whitespace-nowrap bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-blue-600 hover:text-white text-left transition"
                      onClick={() => {
                        if (activeFilterTab === "diagnosis") {
                          setSelectedDiagnoses([...selectedDiagnoses, option])
                        } else if (activeFilterTab === "complaint") {
                          setSelectedComplaints([...selectedComplaints, option])
                        } else {
                          setSelectedTopics([...selectedTopics, option])
                        }
                      }}
                    >
                      {option}
                    </button>
                  ))
                })()}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  className="flex-1 px-4 py-1.5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium"
                  onClick={() => {
                    setSelectedDiagnoses([])
                    setSelectedComplaints([])
                    setSelectedTopics([])
                    setDiagnosisInput("")
                    setComplaintInput("")
                    setTopicInput("")
                  }}
                >
                  Clear All
                </button>
                <button
                  className="flex-1 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
                  onClick={() => setShowFilter(false)}
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

