export const COUNTRY_DATA: Record<string, { cities: string[]; categories: string[] }> = {
    'india': {
        cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur'],
        categories: ['Dentist', 'Gym', 'Bakery', 'Law Firm', 'Interior Designer', 'Real Estate Agency']
    },
    'usa': {
        cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
        categories: ['Dentist', 'Gym', 'Bakery', 'Law Firm', 'HVAC', 'Plumbing']
    },
    'uk': {
        cities: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Newcastle', 'Sheffield', 'Liverpool', 'Leeds', 'Bristol', 'Nottingham'],
        categories: ['Dentist', 'Gym', 'Bakery', 'Law Firm', 'Estate Agent']
    }
};

export const getCountryConfig = (country: string) => {
    const normalized = country.toLowerCase().trim();
    return COUNTRY_DATA[normalized] || COUNTRY_DATA['usa']; // Default to USA if unknown
};
