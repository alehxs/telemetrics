import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const fetchDrivers = async (year, grandPrix, session) => {
  const response = await axios.get(`${API_URL}/drivers/`, {
    params: { year, grand_prix: grandPrix, session },
  });

  return response.data;
}
