import {
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
} from './productController'; 
import productModel from "../models/productModel";
import categoryModel from "../models/categoryModel";

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

    it("getProductController should fetch all products successfully with 200 status", async () => {
        // Arrange
        const mockProducts = [{ name: "Product 1" }, { name: "Product 2" }];
        productModel.find.mockReturnThis();
        productModel.find().populate = jest.fn().mockReturnThis();
        productModel.find().select = jest.fn().mockReturnThis();
        productModel.find().limit = jest.fn().mockReturnThis();
        productModel.find().sort = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await getProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                counTotal: 2,
                products: mockProducts
            })
        );
    });
    
    it('getProductController should handle errors and return 500 status', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error('Database error');
        productModel.find.mockImplementation(() => {
            throw mockError; 
        });

        // Act
        await getProductController(req, res);  

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in getting products",
                error: mockError.message
            })
        );

        consoleSpy.mockRestore();
    });

    it("getSingleProductController should fetch a single product successfully with 200 status", async () => {
        // Arrange
        const mockProduct = { name: "iPhone 15", slug: "iphone-15" };
        req.params.slug = "iphone-15";
        productModel.findOne.mockReturnThis();
        productModel.findOne().select = jest.fn().mockReturnThis();
        productModel.findOne().populate = jest.fn().mockResolvedValue(mockProduct); 

        // Act
        await getSingleProductController(req, res);

        // Assert
        expect(productModel.findOne).toHaveBeenCalledWith({ slug: "iphone-15" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Single Product Fetched",
                product: mockProduct
            })
        );
    });
    
    it('getSingleProductController should handle errors and return 500 status', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error('Database error');
        productModel.findOne.mockImplementation(() => {
            throw mockError; 
        });

        // Act
        await getSingleProductController(req, res);  

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while getting single product",
                error: mockError.message
            })
        );

        consoleSpy.mockRestore();
    });

    it("productPhotoController should fetch photo successfully with 200 status", async () => {
        // Arrange
        req.params.pid = "product-id-123";
        const mockProduct = {
            photo: {
                data: Buffer.from("fake-image-binary"), 
                contentType: "image/png"
            }
        };

        productModel.findById.mockReturnThis();
        productModel.findById().select = jest.fn().mockResolvedValue(mockProduct);

        // Act
        await productPhotoController(req, res);

        // Assert
        expect(productModel.findById).toHaveBeenCalledWith("product-id-123");
        expect(res.set).toHaveBeenCalledWith("Content-type", "image/png"); 
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockProduct.photo.data);
    });
    
    it('productPhotoController should handle errors and return 500 status', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Photo fetch fail");
        productModel.findById.mockImplementation(() => {
            throw mockError; 
        });

        // Act
        await productPhotoController(req, res);  

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while getting photo",
                error: mockError.message
            })
        );

        consoleSpy.mockRestore();
    });

    it("productFiltersController should filter products by BOTH category and price successfully", async () => {
        // Arrange
        req.body = {
            checked: ["cat_id_1", "cat_id_2"],
            radio: [100, 500]
        };
        const mockProducts = [{ name: "Product A" }, { name: "Product B" }];
        productModel.find.mockResolvedValue(mockProducts);

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({
            category: ["cat_id_1", "cat_id_2"],
            price: { $gte: 100, $lte: 500 }
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });
    
    it("productFiltersController should filter by category ONLY when radio is empty", async () => {
        // Arrange
        req.body = {
            checked: ["cat_id_1"],
            radio: [] // When radio is empty, it should not be included in the filter criteria
        };
        const mockProducts = [{ name: "Product A" }, { name: "Product B" }];
        productModel.find.mockResolvedValue(mockProducts);

        // Act
        await productFiltersController(req, res);

        // Assert: 
        expect(productModel.find).toHaveBeenCalledWith({
            category: ["cat_id_1"]
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    it("productFiltersController should filter by price ONLY when checked is empty", async () => {
        // Arrange
        req.body = {
            checked: [], 
            radio: [0, 50]
        };
        const mockProducts = [{ name: "Product A" }, { name: "Product B" }];
        productModel.find.mockResolvedValue(mockProducts);

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({
            price: { $gte: 0, $lte: 50 }
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    it("productFiltersController should handle error and return 400 status with correct typo message", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Filter Database Error");

        req.body = { checked: [], radio: [] };
        productModel.find.mockRejectedValue(mockError);

        // Act
        await productFiltersController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400); 
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error While Filtering Products", 
                error: mockError.message
            })
        );

        consoleSpy.mockRestore();
    });

    it("productCountController should return total product count successfully with 200 status", async () => {
        // Arrange
        const mockTotal = 15; 
        productModel.find.mockReturnThis();
        productModel.find().estimatedDocumentCount = jest.fn().mockResolvedValue(mockTotal);

        // Act
        await productCountController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            total: mockTotal
        });
    });

    it("productCountController should handle error in product count and return 400 status", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Count failed");

        productModel.find.mockReturnThis();
        productModel.find().estimatedDocumentCount = jest.fn().mockRejectedValue(mockError);

        // Act
        await productCountController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400); 
        expect(res.send).toHaveBeenCalledWith({
            message: "Error in product count",
            error: mockError.message, 
            success: false
        });

        consoleSpy.mockRestore();
    });

    it("productListController should fetch products for a specific page with correct skip and limit", async () => {
        // Arrange
        req.params.page = "2"; 
        const mockProducts = [{ name: "Product Page 2" }];

        productModel.find.mockReturnThis();
        productModel.find().select = jest.fn().mockReturnThis();
        productModel.find().skip = jest.fn().mockReturnThis();
        productModel.find().limit = jest.fn().mockReturnThis();
        productModel.find().sort = jest.fn().mockResolvedValue(mockProducts);

        // Act
        await productListController(req, res);

        // Assert
        // 驗證計算邏輯：(2 - 1) * 6 = 6
        expect(productModel.find().skip).toHaveBeenCalledWith(6); 
        // 驗證限制數量：perPage = 6
        expect(productModel.find().limit).toHaveBeenCalledWith(6);
        
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    it("productListController should handle pagination error and return 400 status", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Pagination Fail");
        
        productModel.find.mockReturnThis();
        productModel.find().select = jest.fn().mockReturnThis();
        productModel.find().skip = jest.fn().mockReturnThis();
        productModel.find().limit = jest.fn().mockReturnThis();
        productModel.find().sort = jest.fn().mockRejectedValue(mockError);

        // Act
        await productListController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "error in per page ctrl",
                error: mockError.message
            })
        );

        consoleSpy.mockRestore();
    });

    it("searchProductController should search products by keyword in name or description", async () => {
        // Arrange
        req.params.keyword = "iphone";
        const mockResults = [{ name: "iPhone 15" }, { name: "iPhone 14" }];

        productModel.find.mockReturnThis();
        productModel.find().select = jest.fn().mockResolvedValue(mockResults);

        // Act
        await searchProductController(req, res);

        // Assert
        // 驗證是否使用了 $or 與 $regex，且選項為 "i" (忽略大小寫)
        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: "iphone", $options: "i" } },
                { description: { $regex: "iphone", $options: "i" } },
            ],
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            results: mockResults
        });
    });

    it("searchProductController should handle search error and return 400 status", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Search Failed");
        req.params.keyword = "test";

        productModel.find.mockReturnThis();
        productModel.find().select = jest.fn().mockRejectedValue(mockError);

        // Act
        await searchProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error In Search Product API",
                error: mockError.message
            })
        );

        consoleSpy.mockRestore();
    });

    it("realtedProductController should fetch related products successfully", async () => {
        // Arrange
        req.params.pid = "product123";
        req.params.cid = "category456";
        const mockRelatedProducts = [{ name: "Related 1" }, { name: "Related 2" }];

        productModel.find.mockReturnThis();
        productModel.find().select = jest.fn().mockReturnThis();
        productModel.find().limit = jest.fn().mockReturnThis();
        productModel.find().populate = jest.fn().mockResolvedValue(mockRelatedProducts);

        // Act
        await realtedProductController(req, res);

        // Assert
        // 驗證查詢條件：必須包含 $ne 排除目前商品
        expect(productModel.find).toHaveBeenCalledWith({
            category: "category456",
            _id: { $ne: "product123" }
        });
        expect(productModel.find().limit).toHaveBeenCalledWith(3);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockRelatedProducts 
        });
    });

    it("realtedProductController should handle errors and return 400 status", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Related fetch error");
        
        productModel.find.mockReturnThis();
        productModel.find().select = jest.fn().mockReturnThis();
        productModel.find().limit = jest.fn().mockReturnThis();
        productModel.find().populate = jest.fn().mockRejectedValue(mockError);

        // Act
        await realtedProductController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "error while geting related product", 
            error: mockError.message
        });

        consoleSpy.mockRestore();
    });

    it("productCategoryController should fetch products by category successfully", async () => {
        // Arrange 
        req.params.slug = "electronics";
        const mockCategory = { _id: "cat123", name: "Electronics", slug: "electronics" };
        const mockProducts = [{ name: "Laptop" }, { name: "Phone" }];

        // Step one mock: find category by slug
        categoryModel.findOne.mockResolvedValue(mockCategory);
        
        // Step two mock: find products by category ID
        productModel.find.mockReturnThis();
        productModel.find().populate = jest.fn().mockResolvedValue(mockProducts);

        // Act 
        await productCategoryController(req, res);

        // Assert (驗證)
        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
        expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            category: mockCategory,
            products: mockProducts
        });
    });

    it("productCategoryController should handle error and return 400 status", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockError = new Error("Category DB Error");
        categoryModel.findOne.mockRejectedValue(mockError);

        // Act
        await productCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error While Getting products",
                error: mockError.message
            })
        );

        consoleSpy.mockRestore();
    });
});