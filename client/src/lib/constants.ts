import { Home, Calendar, User, Newspaper, Music, BookOpen, Heart, Hotel, ExternalLink, MessageCircle, Trophy, Sparkles, BookCheck, ShoppingCart, HandHeart, LibraryBig, BookCopy, Sun, ScrollText, Library, Clock } from "lucide-react";

export const ONLINE_SERVICES = [
  {
    id: "seva",
    title: "Seva Booking",
    description: "Perform poojas and sevas remotely or in-person",
    icon: BookCopy,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "donate",
    title: "Donation (Kanike)",
    description: "Contribute to the Math's charitable activities",
    icon: HandHeart,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "accommodation",
    title: "Rooms (Stay)",
    description: "Book your stay at Yatri Nivas",
    icon: Hotel,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "bookstore",
    title: "Bookstore",
    description: "Order spiritual books and publications",
    icon: LibraryBig,
    color: "bg-emerald-100 text-emerald-600",
    url: "https://books.sringeri.net/",
    isExternal: true,
  }
];

export const RESOURCES = [
  {
    id: "bhajan",
    title: "Bhajans & Audio",
    description: "Listen to divine stotras and bhajans",
    icon: Music,
    color: "bg-purple-100 text-purple-600",
    isExternal: true,
    url: "https://bhajan.sringeri.net",
  },
  {
    id: "magazines",
    title: "Magazines",
    description: "Access monthly spiritual magazines",
    icon: BookOpen,
    color: "bg-yellow-100 text-yellow-600",
    isExternal: true,
    url: "https://magazines.sringeri.net",
  },
  {
    id: "stotras",
    title: "Stotras",
    description: "Collection of sacred stotras",
    icon: BookCheck,
    color: "bg-indigo-100 text-indigo-600",
    isExternal: true,
    url: "https://www.sringeri.net/stotras",
  },
  {
    id: "sandhyakala",
    title: "Sandhya Kala Mayukha",
    description: "Sandhya Kala timings and details",
    icon: Sun,
    color: "bg-amber-100 text-amber-600",
    isExternal: true,
    url: "https://sandhyakala.vercel.app/",
  },
  {
    id: "advaita-sharada",
    title: "Advaita Sharada",
    description: "Encyclopaedia of Advaita Vedanta texts",
    icon: ScrollText,
    color: "bg-teal-100 text-teal-600",
    isExternal: true,
    url: "https://advaitasharada.sringeri.net/",
  },
  {
    id: "purana-sharada",
    title: "Purana Sharada",
    description: "Collection of sacred Puranas",
    icon: Library,
    color: "bg-rose-100 text-rose-600",
    isExternal: true,
    url: "https://puranasharada.sringeri.net/",
  },
  {
    id: "darshan-schedule",
    title: "Darshan Schedule",
    description: "Jagadguru Darshan Schedule",
    icon: Clock,
    color: "bg-sky-100 text-sky-600",
    isExternal: true,
    url: "https://sringeri.net/schedule/",
  },
];

export const DEVOTEE_ACTIVITIES = [
  {
    id: "article",
    title: "Article of the Day",
    description: "Wisdom from the Jagadgurus",
    icon: Newspaper,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "quiz",
    title: "Daily Quiz",
    description: "Test your knowledge of Sanatana Dharma",
    icon: MessageCircle,
    color: "bg-cyan-100 text-cyan-600",
  },
  {
    id: "shloka",
    title: "Shloka of the Day",
    description: "Learn a new verse every day",
    icon: Sparkles,
    color: "bg-rose-100 text-rose-600",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    description: "See top contributors and quiz winners",
    icon: Trophy,
    color: "bg-yellow-100 text-yellow-700",
  }
];

export const NEWS_EVENTS = [
  {
    id: 1,
    title: "Mahashivaratri Celebrations 2026",
    date: "Feb 18, 2026",
    type: "Event",
    description: "Join us for the grand celebration of Mahashivaratri at Sringeri.",
    image: "/assets/temple-hero.jpg"
  },
  {
    id: 2,
    title: "New Guest House Inauguration",
    date: "Jan 15, 2026",
    type: "News",
    description: "New facility for pilgrims inaugurated by the Jagadguru.",
    image: "/assets/temple-hero.jpg"
  },
];

export const USER_MOCK = {
  uid: "12345",
  name: "Aditya Sharma",
  email: "aditya.sharma@example.com",
  phone: "+91 98765 43210",
  nakshatra: "Rohini",
  gothra: "Kashyapa",
};
