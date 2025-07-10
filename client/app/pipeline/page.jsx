"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Youtube, Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function Pipeline() {
    const [youtubeUrl, setYoutubeUrl] = useState("")
    const [chiefComplaint, setChiefComplaint] = useState("")
    const [tagsInput, setTagsInput] = useState("")
    const [tags, setTags] = useState([])
    const [topics, setTopics] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Handle tag input and splitting on comma
    const handleTagsInputChange = (e) => {
        const value = e.target.value
        if (value.endsWith(",")) {
            const newTag = value.slice(0, -1).trim()
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag])
            }
            setTagsInput("")
        } else {
            setTagsInput(value)
        }
    }

    // Remove tag by index
    const handleRemoveTag = (idx) => {
        setTags(tags.filter((_, i) => i !== idx))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!youtubeUrl.trim()) {
            alert("Please enter a YouTube URL")
            return
        }
        
        setIsSubmitting(true)
        
        // Simulate processing time
        setTimeout(() => {
            alert(
                `Video added to database successfully!\nURL: ${youtubeUrl}\nChief Complaint: ${chiefComplaint}\nTags: ${tags.join(", ")}\nTopics: ${topics}`
            )
            setYoutubeUrl("")
            setChiefComplaint("")
            setTagsInput("")
            setTags([])
            setTopics("")
            setIsSubmitting(false)
        }, 1000)
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
            
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl mb-8"
            >
                <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Search
                </Link>
                
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-4"
                    >
                        <Youtube className="w-8 h-8 text-white" />
                    </motion.div>
                    
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent"
                    >
                        Video Pipeline
                    </motion.h1>
                    
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-zinc-400 text-lg"
                    >
                        Add new medical videos to the database
                    </motion.p>
                </div>
            </motion.div>

            {/* Main Form */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="w-full max-w-2xl"
            >
                <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-6 sm:p-8 backdrop-blur">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="youtube-url" className="block text-sm font-medium text-zinc-300 mb-3">
                                YouTube URL
                            </label>
                            <div className="relative">
                                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                <input
                                    id="youtube-url"
                                    type="url"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                                    required
                                />
                            </div>
                            <p className="mt-2 text-xs text-zinc-500">
                                Enter a valid YouTube URL to add the video to our medical database
                            </p>
                        </div>

                        {/* Chief Complaint */}
                        <div>
                            <label htmlFor="chief-complaint" className="block text-sm font-medium text-zinc-300 mb-3">
                                Chief Complaint
                            </label>
                            <input
                                id="chief-complaint"
                                type="text"
                                value={chiefComplaint}
                                onChange={(e) => setChiefComplaint(e.target.value)}
                                placeholder="e.g. Chest pain"
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                                required
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label htmlFor="tags" className="block text-sm font-medium text-zinc-300 mb-3">
                                Tags (comma separated)
                            </label>
                            <input
                                id="tags"
                                type="text"
                                value={tagsInput}
                                onChange={handleTagsInputChange}
                                placeholder="e.g. cardiology, emergency, ECG"
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                            />
                            {/* Tag pills UI */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((tag, idx) => (
                                    <span
                                        key={tag + idx}
                                        className="inline-flex items-center bg-red-600/80 text-white px-3 py-1 rounded-full text-xs font-medium"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(idx)}
                                            className="ml-2 text-white/70 hover:text-white focus:outline-none"
                                            aria-label={`Remove tag ${tag}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-zinc-500">
                                Separate tags with commas (e.g. cardiology, emergency, ECG)
                            </p>
                        </div>

                        {/* Topics */}
                        <div>
                            <label htmlFor="topics" className="block text-sm font-medium text-zinc-300 mb-3">
                                Topics
                            </label>
                            <input
                                id="topics"
                                type="text"
                                value={topics}
                                onChange={(e) => setTopics(e.target.value)}
                                placeholder="e.g. STEMI, arrhythmia"
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                            />
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                            className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2 ${
                                isSubmitting 
                                    ? "bg-zinc-600 cursor-not-allowed" 
                                    : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Add Video to Database
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>

                {/* Info Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8"
                >
                    <div className="bg-zinc-800/20 rounded-lg p-4 border border-zinc-700/30">
                        <h3 className="font-medium text-white mb-2">Automatic Processing</h3>
                        <p className="text-sm text-zinc-400">
                            Videos are automatically transcribed and tagged with medical entities
                        </p>
                    </div>
                    <div className="bg-zinc-800/20 rounded-lg p-4 border border-zinc-700/30">
                        <h3 className="font-medium text-white mb-2">Quality Control</h3>
                        <p className="text-sm text-zinc-400">
                            All videos are reviewed to ensure they meet our medical education standards
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    )
}