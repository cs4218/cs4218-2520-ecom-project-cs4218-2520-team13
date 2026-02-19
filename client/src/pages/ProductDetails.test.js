import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import ProductDetails from './ProductDetails';
import { describe } from 'node:test';

jest.mock('axios');
// For useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // Retain other actual functionalities of react-router-dom
    useNavigate: () => mockNavigate,
}));

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
})); 

const mockProduct = {
  _id: "p123",
  name: "High-Performance Laptop",
  description: "A powerful laptop for all your professional needs.",
  price: 999.99,
  category: { 
    name: "Electronics",
    _id: "c123"
  },
  slug: "laptop-pro-2024"
};

const mockRelatedProducts = [
  {
    _id: "p456",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse.",
    price: 49.99,
    slug: "wireless-mouse"
  }
];

describe('ProductDetails Page Unit Tests', () => {
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
            <MemoryRouter initialEntries={["/product/"]}>  
                <Routes>
                    <Route path="/product/" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        expect(getSpy).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/product/get-product/")    // Check whether this specific API endpoint is called
        );

        getSpy.mockRestore(); // Restore original implementation of axios.get
    });

    it('Should fetch and display product details (getProduct function)', async () => {
        // Arrange
        // Header > Get product details API > Get related products API
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: [] } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        /* 
        Screen is better than getByText, getByRole, etc. because getByText will run the render every time it is called, 
        while screen will only run the render once and then cache the result for future calls. This can improve performance 
        and reduce unnecessary re-renders in your tests.
        */ 
        await waitFor(() => {
            expect(screen.getByText(`Name : ${mockProduct.name}`)).toBeInTheDocument();
            expect(screen.getByText(`Description : ${mockProduct.description}`)).toBeInTheDocument();
            // Using regex expression as it is not in the same line in JSX
            expect(screen.getByText(/Price\s*:\s*\$999\.99/i)).toBeInTheDocument();
            expect(screen.getByText(`Category : ${mockProduct.category.name}`)).toBeInTheDocument();
        });
    });

    it('Should handle API errors (getProduct function)', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to suppress error logs in test output
        const mockError = new Error('API error');
        
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/get-product/')) {
                return Promise.reject(mockError);
            }
            return Promise.resolve({ data: { category: [] } }); // For Header
        });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        consoleSpy.mockRestore(); // Restore original console.log implementation
    });

    it('Should fetch and display related products (getSimilarProduct function)', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(screen.getByText(mockRelatedProducts[0].name)).toBeInTheDocument();
            expect(axios.get).toHaveBeenCalledWith(`/api/v1/product/related-product/${mockProduct._id}/${mockProduct.category._id}`);
        });
    });

    it('Should handle API errors (getSimilarProduct function)', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to suppress error logs in test output
        const mockError = new Error('API error');
        
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/related-product/')) {
                return Promise.reject(mockError);
            }
            else if (url.includes('/api/v1/product/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.resolve({ data: { category: [] } }); // For Header
        });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        consoleSpy.mockRestore(); // Restore original console.log implementation
    });

    it('Simulates clicking the More Details button', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/related-product/')) {
                return Promise.resolve({ data: { products: mockRelatedProducts } });
            }
            else if (url.includes('/api/v1/product/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.resolve({ data: { category: [] } }); // For Header
        });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        const moreDetailsBtn = await waitFor(() => screen.getByRole('button', { name: /more details/i }));
        fireEvent.click(moreDetailsBtn);

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith(`/product/${mockRelatedProducts[0].slug}`);

    });

});

