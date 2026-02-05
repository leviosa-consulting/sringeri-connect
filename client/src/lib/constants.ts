import { Home, Calendar, User, Newspaper, Music, BookOpen, Heart, Hotel, ExternalLink } from "lucide-react";

export const SERVICES = [
  {
    id: "seva",
    title: "Seva Booking",
    description: "Perform poojas and sevas remotely or in-person",
    icon: Heart,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "donate",
    title: "Donation (Kanike)",
    description: "Contribute to the Math's charitable activities",
    icon: Heart,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "accommodation",
    title: "Accommodation",
    description: "Book your stay at Yatri Nivas",
    icon: Hotel,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "magazines",
    title: "Publications",
    description: "Access spiritual magazines and books",
    icon: BookOpen,
    color: "bg-yellow-100 text-yellow-600",
    isExternal: true,
  },
  {
    id: "bhajan",
    title: "Bhajans & Audio",
    description: "Listen to divine stotras and bhajans",
    icon: Music,
    color: "bg-purple-100 text-purple-600",
    isExternal: true,
  },
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
