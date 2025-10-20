import axios from "axios";
import { ApiKey } from "../constants/list";

const baseUrl = "https://exercisedb.p.rapidapi.com";
const apiCall = async (url, params = {}) => {
    try {
        const options = {
            method: "GET",
            url,
            params,
            headers: {
                "x-rapidapi-host": "exercisedb.p.rapidapi.com",
                "x-rapidapi-key": ApiKey,
            },
        };

        const response = await axios.request(options);
        console.log("API Response:", response.data);
        return response.data;
    } catch (error) {
        console.log(" API Error:", error.response?.data || error.message);
        return null;
    }
};

export const fetchExercisesByBodyPart = async (bodypart) => {
    return await apiCall(`${baseUrl}/exercises/bodyPart/${bodypart}`);
};