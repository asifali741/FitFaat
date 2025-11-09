export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  consultationFee: string;
  email: string;
  tags: string[];
  rating: number;
  availableDates: string[];
  availableTimes: string[];
}

export const dummyDoctors: Doctor[] = [
  {
    id: "1",
    name: "Dr. Roshan",
    specialty: "Physiotherapist",
    experience: "8 years",
    consultationFee: "$50",
    email: "roshan@fakedomian.net",
    tags: ["Punctual", "Talkative", "Knowledgeable", "Positive User Response"],
    rating: 4.8,
    availableDates: ["2025-03-29", "2025-03-30", "2025-04-01"],
    availableTimes: ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"]
  },
  {
    id: "2",
    name: "Dr. Elynn Lee",
    specialty: "Nutritionist",
    experience: "5 years",
    consultationFee: "$45",
    email: "elynn@fakedomian.net",
    tags: ["Knowledgeable", "Patient", "Detail-oriented"],
    rating: 4.6,
    availableDates: ["2025-03-29", "2025-04-02", "2025-04-05"],
    availableTimes: ["10:00 AM", "12:00 PM", "03:00 PM"]
  },
  {
    id: "3",
    name: "Dr. Lee Rock",
    specialty: "Sports Medicine",
    experience: "10 years",
    consultationFee: "$60",
    email: "leerock@fakedomian.net",
    tags: ["Experienced", "Professional", "Results-driven"],
    rating: 4.9,
    availableDates: ["2025-03-29", "2025-03-31", "2025-04-03"],
    availableTimes: ["08:00 AM", "01:00 PM", "05:00 PM"]
  },
  {
    id: "4",
    name: "Dr. Kurosaki",
    specialty: "General Physician",
    experience: "12 years",
    consultationFee: "$55",
    email: "kurosaki@fakedomian.net",
    tags: ["Compassionate", "Thorough", "Highly Recommended"],
    rating: 4.7,
    availableDates: ["2025-03-29", "2025-04-01", "2025-04-04"],
    availableTimes: ["09:30 AM", "11:30 AM", "02:30 PM", "04:30 PM"]
  }
];

export const getDoctorsByDate = (date: string): Doctor[] => {
  return dummyDoctors.filter(doctor => 
    doctor.availableDates.includes(date)
  );
};

export const getDoctorById = (id: string): Doctor | undefined => {
  return dummyDoctors.find(doctor => doctor.id === id);
};

// Dummy export to prevent Expo Router warnings
export default null;
