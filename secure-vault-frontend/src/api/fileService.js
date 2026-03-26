import api from './client'

export const fileService = {
    //Fetch all files
    getFiles: async (search = '') => {
        const { data } = await api.get('/files/', {params: {search}});
        return data.results;
    },

    // Upload  a new file (Multipart)
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post('/files/upload_and_encrypt/', formData, {
            headers: { 'Content-Type': 'multipart/form-data'}
        });
        return data;
    }
}