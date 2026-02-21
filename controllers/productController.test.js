import {
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  relatedProductController,
  productCategoryController,
} from './productController'; 
import productModel from "../models/productModel";
import categoryModel from "../models/categoryModel";
import { error } from 'console';

jest.mock("../models/productModel");
jest.mock("../models/categoryModel");

describe('Product Controller Unit Tests', () => {
    let req, res;
    beforeEach(() => {
        jest.clearAllMocks();
        req = { params: {}, body: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis()
        };
    });

    it("getProductController should return 500 status when database operation fails", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Database Connection Timeout");
        
        // Setup: Mock the Mongoose chain to reject at the final execution step
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockRejectedValue(mockError) // Simulate async failure
        });

        // Act
        // Action: Call the controller with the mocked objects
        await getProductController(req, res);

        // Assert
        // Check: Verify status code is 500 and the error message is correctly returned
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Error in getting products",
            error: mockError.message
        }));

        // Cleanup: Restore console
        consoleSpy.mockRestore();
    });

    // Success Path: Empty Result
    it("getProductController should return 200 and counTotal 0 when no products are found", async () => {
        // Arrange
        // Setup: Database returns an empty array
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([]) 
        });

        // Act
        await getProductController(req, res);

        // Assert
        // Check: Ensure the API responds correctly to an empty database
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            countTotal: 0,           // Matching the typo in your controller
            message: "AllProducts", // Matching the typo and trailing space
            products: []
        });
    });

    // Success Path: Single Item
    it("getProductController should return correct data structure and 200 status", async () => {
        // Arrange
        // Setup: Create a single mock product
        const mockProducts = [{ name: "Test Product", price: 10 }];
        
        // Setup: Mock the chain to return our mock product
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockProducts)
        });

        // Act
        await getProductController(req, res);

        // Assert
        // Check: Verify the basic response properties
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            countTotal: 1, 
            products: mockProducts
        }));
    });

    it("getProductController should apply correct database constraints (limit 12, sort by newest)", async () => {
        // Arrange
        const limitSpy = jest.fn().mockReturnThis();
        const sortSpy = jest.fn().mockResolvedValue([]); // We don't care about the data here

        // Setup: Spy on the arguments passed to Mongoose methods
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            limit: limitSpy,
            sort: sortSpy
        });

        // Act
        await getProductController(req, res);

        // Assert
        // Check: Verify the code logic tells DB to limit by 12 and sort descending
        expect(limitSpy).toHaveBeenCalledWith(12);
        expect(sortSpy).toHaveBeenCalledWith({ createdAt: -1 });
    });

    // Failure Path: Database/Server Error
    it("getSingleProductController should handle errors and return 500 status code", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Database query failed");

        productModel.findOne = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            populate: jest.fn().mockRejectedValue(mockError)
        });

        // Act
        await getSingleProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Error while getting single product",
            error: mockError.message
        }));

        consoleSpy.mockRestore();
    });

    // Success Path: Product Not Found
    it("getSingleProductController should return 200 with product as null when the slug does not exist", async () => {
        // Arrange
        // Database returns null when no matching document is found
        productModel.findOne = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue(null)
        });

        // Act
        await getSingleProductController(req, res);

        // Assert
        // Even if not found, the controller currently returns 200 with product: null
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            product: null
        }));
    });

    // Success Path: Product Found
    it("getSingleProductController should return 200 and the product data when a valid slug is provided", async () => {
        // Arrange
        const mockProduct = { name: "Test Product", slug: "test-product-slug" };
        
        productModel.findOne = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue(mockProduct)
        });

        // Act
        await getSingleProductController(req, res);

        // Assert
        // Verify response structure for a successful find
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Single Product Fetched",
            product: mockProduct
        });
    });

    //  Query Parameters Verification
    it("getSingleProductController should call findOne with the correct slug and populate category", async () => {
        // Arrange
        req.params.slug = "iphone-15-pro";
        const findOneSpy = jest.spyOn(productModel, 'findOne').mockReturnValue({
            select: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue({ name: "iPhone 15 Pro" })
        });

        // Act
        await getSingleProductController(req, res);

        // Assert
        // Verify the logic: correctly identifying product by slug and excluding photo
        expect(findOneSpy).toHaveBeenCalledWith({ slug: "iphone-15-pro" });
    });

    // Success Path: Product and Photo Data Exist
    it("productPhotoController should return 200 and photo data when everything is valid", async () => {
        // Arrange
        const testPid = "valid-pid-123";
        req.params.pid = testPid;
        const mockProduct = {
            photo: {
                data: Buffer.from("fake-binary-data"),
                contentType: "image/png"
            }
        };

        productModel.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockProduct)
        });

        // Act
        await productPhotoController(req, res);

        // Assert
        expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockProduct.photo.data);
        
    });

    // Failure Path: Product Not Found
    it("productPhotoController should return 404 when product is not found", async () => {
        // Arrange
        const testPid = "missing-pid-456";
        req.params.pid = testPid;

        productModel.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        // Act
        await productPhotoController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Product not found"
        });
    });

    //  Failure Path: Product exists but photo field is missing
    it("productPhotoController should return 404 when product has no photo field", async () => {
        // Arrange
        const testPid = "no-photo-field-789";
        req.params.pid = testPid;
        const mockProduct = {};

        productModel.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockProduct)
        });

        // Act
        await productPhotoController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "No photo found for this product"
        });
    });

    //  Failure Path: Product exists but photo.data is null
    it("productPhotoController should return 404 when photo data is null", async () => {
        // Arrange
        const testPid = "null-data-pid-000";
        req.params.pid = testPid;
        const mockProduct = {
            photo: {
                data: null,
                contentType: "image/jpeg"
            }
        };

        productModel.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockProduct)
        });

        // Act
        await productPhotoController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "No photo found for this product"
        });
    });

    // Failure Path: Database Error
    it("productPhotoController should return 500 when database query fails", async () => {
        // Arrange
        const testPid = "error-pid-999";
        req.params.pid = testPid;
        const mockError = new Error("Database connection error");
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        productModel.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockRejectedValue(mockError)
        });

        // Act
        await productPhotoController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting photo",
            error: mockError.message
        });

        consoleSpy.mockRestore();
    });

    // Success Path: No filters provided (Fetch all)
    it("productFiltersController should return all products when checked and radio are empty", async () => {
        // Arrange
        req.body.checked = [];
        req.body.radio = [];
        const mockProducts = [{ name: "P1" }, { name: "P2" }];
        productModel.find = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    // Success Path: Filter by category (checked) only
    it("productFiltersController should filter by category when checked has values", async () => {
        // Arrange
        const categories = ["cat1", "cat2"];
        const mockProducts = [{ name: "Filtered Product", category: "cat1" }];
        req.body.checked = categories;
        req.body.radio = [];
        
        productModel.find = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await productFiltersController(req, res);

        // Assert
        // Verify database was called with the correct filter object
        expect(productModel.find).toHaveBeenCalledWith({ category: categories });
        
        // Verify response contains the exact data returned by the database
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    // Success Path: Filter by price (radio) only
    it("productFiltersController should filter by price range when radio has values", async () => {
        // Arrange
        const priceRange = [10, 50];
        const mockProducts = [{ name: "Budget Phone", price: 30 }];
        req.body.checked = [];
        req.body.radio = priceRange;
        
        productModel.find = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({
            price: { $gte: 10, $lte: 50 }
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    // Success Path: Combined filters (Both checked and radio)
    it("productFiltersController should filter by both category and price", async () => {
        // Arrange
        const categories = ["electronics"];
        const priceRange = [100, 200];
        const mockProducts = [{ name: "Laptop", category: "electronics", price: 150 }];
        req.body.checked = categories;
        req.body.radio = priceRange;
        
        productModel.find = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({
            category: categories,
            price: { $gte: 100, $lte: 200 }
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    // Failure Path: Catch Error (e.g., Database Failure)
    it("productFiltersController should return 400 when database find fails", async () => {
        // Arrange
        req.body.checked = [];
        req.body.radio = [];
        const mockError = new Error("Query Error");
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        productModel.find = jest.fn().mockRejectedValue(mockError);

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Filtering Products",
            error: mockError.message
        });

        consoleSpy.mockRestore();
    });

    // Failure Path: Input Validation Error (Triggering the "checked.length" crash)
    it("productFiltersController should return 400 if checked is undefined", async () => {
        // Arrange
        req.body = { radio: [10, 20] }; // checked is missing
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Error While Filtering Products"
        }));

        consoleSpy.mockRestore();
    });

    // Failure Path: radio is undefined while checked is valid
    it("productFiltersController should return 400 if radio is undefined", async () => {
        // Arrange
        req.body.checked = []; 
        req.body.radio = undefined; 
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Error While Filtering Products"
        }));

        consoleSpy.mockRestore();
    });

    // Success Path
    it("productCountController should return 200 and the total count of products", async () => {
        // Arrange
        const mockCount = 42;
        productModel.estimatedDocumentCount = jest.fn().mockResolvedValue(mockCount);

        // Act
        await productCountController(req, res);

        // Assert
        expect(productModel.estimatedDocumentCount).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            total: mockCount
        });
    });

    // Failure Path
    it("productCountController should return 500 when database fails", async () => {
        // Arrange
        const mockError = new Error("Database connection failed");
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        productModel.estimatedDocumentCount = jest.fn().mockRejectedValue(mockError);

        // Act
        await productCountController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error in product count",
            error: mockError.message
        });

        consoleSpy.mockRestore();
    });

    // Testing boundary values and invalid inputs using a loop
    test.each([
        { input: "abc", expectedSkip: 0, description: "invalid string NaN" },
        { input: "0",   expectedSkip: 0, description: "zero" },
        { input: "-5",  expectedSkip: 0, description: "negative number" },
        { input: undefined, expectedSkip: 0, description: "missing parameter" },
    ])("productListController should set skip to $expectedSkip when page is $description ($input)", async ({ input, expectedSkip }) => {
        // Arrange
        req.params.page = input;
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.skip = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockResolvedValue([]);

        // Act
        await productListController(req, res);

        // Assert
        expect(productModel.skip).toHaveBeenCalledWith(expectedSkip);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // Success Path - Page 2
    it("productListController should skip 6 products when page 2 is requested", async () => {
        // Arrange
        req.params.page = "2";
        const mockProducts = [{ name: "P7" }];
        
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.skip = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await productListController(req, res);

        // Assert
        expect(productModel.skip).toHaveBeenCalledWith(6);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    // Failure Path
    it("productListController should return 500 when database fails", async () => {
        // Arrange
        req.params.page = "1";
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.skip = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockRejectedValue(new Error("DB Connection Failed"));

        // Act
        await productListController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "error in per page ctrl",
            error: "DB Connection Failed"
        }));

        consoleSpy.mockRestore();
    });

    // Invalid Keywords (The 'if' block)
    test.each([
        { input: "", desc: "empty string" },
        { input: "   ", desc: "string with only spaces" },
    ])("searchProductController should return 400 when keyword is $desc", async ({ input }) => {
        // Arrange
        req.params.keyword = input;

        // Act
        await searchProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Keyword is required",
        });
        expect(productModel.find).not.toHaveBeenCalled(); 
    });

    // Success Path
    it("searchProductController should return 200 and products matching the keyword", async () => {
        // Arrange
        const keyword = "phone";
        req.params.keyword = keyword;
        const mockResults = [{ name: "iPhone" }, { name: "Smartphone" }];

        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockResolvedValue(mockResults);

        // Act
        await searchProductController(req, res);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({
        $or: [
            { name: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
        ],
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            results: mockResults,
        });
    });

    // Failure Path
    it("searchProductController should return 500 when database fails", async () => {
        // Arrange
        req.params.keyword = "test";
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockRejectedValue(new Error("DB Error"));

        // Act
        await searchProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Error In Search Product API",
            error: "DB Error"
        }));

        consoleSpy.mockRestore();
    });

    //  Validation Path: Missing pid or cid 
    test.each([
        { params: { cid: "cat123" }, desc: "missing pid" },
        { params: { pid: "prod123" }, desc: "missing cid" },
    ])("should return 400 when $desc", async ({ params }) => {
        // Arrange
        req.params = params;

        // Act
        await relatedProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Product ID and Category ID are required"
        }));
        expect(productModel.find).not.toHaveBeenCalled(); 
    });

    //  Success Path: Found related products
    it("should return 200 and related products (excluding current pid)", async () => {
        // Arrange
        const pid = "p123";
        const cid = "c456";
        req.params = { pid, cid };
        const mockProducts = [{ name: "Similar Item" }];

        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await relatedProductController(req, res);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({
            category: cid,
            _id: { $ne: pid }
        });
        expect(productModel.limit).toHaveBeenCalledWith(3);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    //  Failure Path: Database Error
    it("should return 500 when database fails", async () => {
        // Arrange
        req.params = { pid: "p1", cid: "c1" };
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockRejectedValue(new Error("Database Crash"));

        // Act
        await relatedProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "error while getting related product",
            error: "Database Crash"
        }));

        consoleSpy.mockRestore();
    });

    // Failure Path: Missing Slug
    it("should return 400 if slug is missing", async () => {
        // Arrange
        req.params.slug = ""; 

        // Act
        await productCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ 
            success: false,
            message: "Slug is required" 
        }));
    });

    // Failure Path: Category Not Found in DB
    it("should return 404 if category is not found in database", async () => {
        // Arrange
        req.params.slug = "non-existent-category";
        categoryModel.findOne = jest.fn().mockResolvedValue(null); // Mock no category found
        
        // Act
        await productCategoryController(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ 
            success: false,
            message: "Category not found in database" 
        }));
        expect(productModel.find).not.toHaveBeenCalled(); // Verify early return (efficiency)
    });

    // Success Path: Valid Slug and Existing Data
    it("should return 200 and products when valid slug is provided", async () => {
        // Arrange
        const mockSlug = "electronics";
        const mockCategory = { _id: "cat123", name: "Electronics", slug: mockSlug };
        const mockProducts = [{ name: "TV" }, { name: "Radio" }];
        
        req.params.slug = mockSlug;
        categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
        productModel.find = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await productCategoryController(req, res);

        // Assert
        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: mockSlug });
        expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            category: mockCategory,
            products: mockProducts
        });
    });

    // Failure Path: Database/Server Exception
    it("should return 500 when database operation throws an error", async () => {
        // Arrange
        req.params.slug = "electronics";
        const mockError = new Error("Connection Timeout");
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        
        categoryModel.findOne = jest.fn().mockRejectedValue(mockError);

        // Act
        await productCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ 
            success: false,
            message: "Error While Getting products",
            error: mockError.message
        }));

        consoleSpy.mockRestore();
    });
});