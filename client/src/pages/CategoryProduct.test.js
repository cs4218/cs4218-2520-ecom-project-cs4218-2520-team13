import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import CategoryProduct from './CategoryProduct';
import { describe } from 'node:test';

jest.mock('axios');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // Retain other actual functionalities of react-router-dom
    useNavigate: () => mockNavigate,
}));

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));
    
jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
})); 

describe('CategoryProduct Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Simulates if there is no slug in the URL', async () => {
        // Arrange
        const getSpy = jest.spyOn(axios, 'get');
        axios.get.mockResolvedValue({ data: { category: [] } });

        // Act
        // Dont have the slug
        render(
            <MemoryRouter initialEntries={["/category/"]}>  
                <Routes>
                    <Route path="/category/" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        expect(getSpy).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/product/product-category/")    // Check whether this specific API endpoint is called
        );

        getSpy.mockRestore(); // Restore original implementation of axios.get
    });

    it('renders CategoryProduct component', async () => {
        // Arrange 
        // For Header (the order of mockResolvedValueOnce is important)
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({
            data: {
                products: [],
                category: { name: 'Test' }
            }
        });

        // Act
        render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-category/electronics");
        });
    });

    it('Shows the name and price of the product', async () => {
        // Arrange
        const mockData = {
            // Cuz it uses map in jsx, it needs to be an array
            products: [{ _id: "p1", name: "Laptop", price: 1000, description: "Excellent laptop" }],
            category: { name: 'Electronics' }
        }
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({ data: mockData });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(getByText('Category - Electronics')).toBeInTheDocument();
            expect(getByText('Laptop')).toBeInTheDocument();
            expect(getByText('$1,000.00')).toBeInTheDocument();
            expect(getByText('Excellent laptop...')).toBeInTheDocument();
        });
    });

    it('Shows error message on console log when API call fails', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Empty console log to avoid cluttering test output
        const mockError = new Error('API call failed');

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/product-category/')) {
                return Promise.reject(mockError);
            }
            return Promise.resolve({ data: { category: [] } });
        });

        // Act
        render(
            <MemoryRouter initialEntries={["/category/electronics"]}>   
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        consoleSpy.mockRestore(); // Restore original console log implementation
    });

    it('Simulates clicking the More Details button', async () => {
        // Arrange
        const mockData = {
            products: [{ _id: "p1", name: "Laptop", price: 1000, description: "Excellent laptop", slug: "laptop" }],
            category: { name: 'Electronics' }
        }
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/product-category/')) {
                return Promise.resolve({ data: mockData });
            }
            return Promise.resolve({ data: { category: [] } }); // For Header
        });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        const button = await waitFor(() => getByText('More Details'));
        fireEvent.click(button);

        expect(mockNavigate).toHaveBeenCalledWith('/product/laptop');
    });
});
