const path = require('path');
const fs = require('fs');

class UploadController {
  // Upload single image
  async uploadSingle(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Ensure field name matches (profilePicture or file) and form is multipart/form-data.'
        });
      }

  // Destination may contain OS-specific separators; use path.basename for folder name
  const folderName = path.basename(req.file.destination);
  const fileUrl = `/uploads/${folderName}/${req.file.filename}`;

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          url: fileUrl,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('Upload single error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during file upload'
      });
    }
  }

  // Upload multiple images
  async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => {
        const folderName = path.basename(file.destination);
        return {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: `/uploads/${folderName}/${file.filename}`,
          mimetype: file.mimetype
        };
      });

      res.json({
        success: true,
        message: `${req.files.length} files uploaded successfully`,
        data: {
          files: uploadedFiles,
          count: req.files.length
        }
      });

    } catch (error) {
      console.error('Upload multiple error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during file upload'
      });
    }
  }

  // Delete uploaded file
  async deleteFile(req, res) {
    try {
      const { filename, folder } = req.params;

      if (!filename || !folder) {
        return res.status(400).json({
          success: false,
          message: 'Filename and folder are required'
        });
      }

      // Validate folder to prevent path traversal
      const allowedFolders = [
        'profiles', 'shops', 'products', 'secondhand', 'free-items',
        'rentals', 'accommodations', 'lost-found', 'businesses', 'temp'
      ];

      if (!allowedFolders.includes(folder)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder specified'
        });
      }

      const filePath = path.join(__dirname, '../uploads', folder, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Delete file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during file deletion'
      });
    }
  }

  // Get file information
  async getFileInfo(req, res) {
    try {
      const { filename, folder } = req.params;

      if (!filename || !folder) {
        return res.status(400).json({
          success: false,
          message: 'Filename and folder are required'
        });
      }

      // Validate folder
      const allowedFolders = [
        'profiles', 'shops', 'products', 'secondhand', 'free-items',
        'rentals', 'accommodations', 'lost-found', 'businesses', 'temp'
      ];

      if (!allowedFolders.includes(folder)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder specified'
        });
      }

      const filePath = path.join(__dirname, '../uploads', folder, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Get file stats
      const stats = fs.statSync(filePath);

      res.json({
        success: true,
        data: {
          filename: filename,
          folder: folder,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${folder}/${filename}`
        }
      });

    } catch (error) {
      console.error('Get file info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // List files in a folder
  async listFiles(req, res) {
    try {
      const { folder } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!folder) {
        return res.status(400).json({
          success: false,
          message: 'Folder is required'
        });
      }

      // Validate folder
      const allowedFolders = [
        'profiles', 'shops', 'products', 'secondhand', 'free-items',
        'rentals', 'accommodations', 'lost-found', 'businesses', 'temp'
      ];

      if (!allowedFolders.includes(folder)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder specified'
        });
      }

      const folderPath = path.join(__dirname, '../uploads', folder);

      // Check if folder exists
      if (!fs.existsSync(folderPath)) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      // Read folder contents
      const files = fs.readdirSync(folderPath);
      
      // Get file details
      const fileDetails = files.map(filename => {
        const filePath = path.join(folderPath, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename: filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${folder}/${filename}`,
          isFile: stats.isFile()
        };
      }).filter(file => file.isFile);

      // Sort by creation date (newest first)
      fileDetails.sort((a, b) => new Date(b.created) - new Date(a.created));

      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedFiles = fileDetails.slice(startIndex, endIndex);

      const totalFiles = fileDetails.length;
      const totalPages = Math.ceil(totalFiles / parseInt(limit));

      res.json({
        success: true,
        data: {
          files: paginatedFiles,
          pagination: {
            currentPage: parseInt(page),
            totalPages: totalPages,
            totalFiles: totalFiles,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('List files error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Clean up temporary files (older than 24 hours)
  async cleanupTempFiles(req, res) {
    try {
      const tempFolderPath = path.join(__dirname, '../uploads/temp');

      if (!fs.existsSync(tempFolderPath)) {
        return res.json({
          success: true,
          message: 'Temp folder does not exist',
          data: { deletedFiles: 0 }
        });
      }

      const files = fs.readdirSync(tempFolderPath);
      let deletedCount = 0;
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      files.forEach(filename => {
        const filePath = path.join(tempFolderPath, filename);
        const stats = fs.statSync(filePath);

        if (stats.birthtime < oneDayAgo) {
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting temp file ${filename}:`, error);
          }
        }
      });

      res.json({
        success: true,
        message: `Cleanup completed. ${deletedCount} temporary files deleted.`,
        data: { deletedFiles: deletedCount }
      });

    } catch (error) {
      console.error('Cleanup temp files error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during cleanup'
      });
    }
  }

  // Move file from temp to permanent folder
  async moveFromTemp(req, res) {
    try {
      const { filename, targetFolder } = req.body;

      if (!filename || !targetFolder) {
        return res.status(400).json({
          success: false,
          message: 'Filename and target folder are required'
        });
      }

      // Validate target folder
      const allowedFolders = [
        'profiles', 'shops', 'products', 'secondhand', 'free-items',
        'rentals', 'accommodations', 'lost-found', 'businesses'
      ];

      if (!allowedFolders.includes(targetFolder)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid target folder specified'
        });
      }

      const tempPath = path.join(__dirname, '../uploads/temp', filename);
      const targetPath = path.join(__dirname, '../uploads', targetFolder, filename);

      // Check if temp file exists
      if (!fs.existsSync(tempPath)) {
        return res.status(404).json({
          success: false,
          message: 'Temporary file not found'
        });
      }

      // Ensure target folder exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Move file
      fs.renameSync(tempPath, targetPath);

      res.json({
        success: true,
        message: 'File moved successfully',
        data: {
          filename: filename,
          newUrl: `/uploads/${targetFolder}/${filename}`
        }
      });

    } catch (error) {
      console.error('Move from temp error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during file move'
      });
    }
  }

  // Get upload statistics
  async getUploadStats(req, res) {
    try {
      const uploadsPath = path.join(__dirname, '../uploads');
      const folders = [
        'profiles', 'shops', 'products', 'secondhand', 'free-items',
        'rentals', 'accommodations', 'lost-found', 'businesses', 'temp'
      ];

      const stats = {};

      folders.forEach(folder => {
        const folderPath = path.join(uploadsPath, folder);
        
        if (fs.existsSync(folderPath)) {
          const files = fs.readdirSync(folderPath);
          let totalSize = 0;

          files.forEach(filename => {
            try {
              const filePath = path.join(folderPath, filename);
              const fileStats = fs.statSync(filePath);
              if (fileStats.isFile()) {
                totalSize += fileStats.size;
              }
            } catch (error) {
              // File might have been deleted, skip it
            }
          });

          stats[folder] = {
            fileCount: files.length,
            totalSize: totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
          };
        } else {
          stats[folder] = {
            fileCount: 0,
            totalSize: 0,
            totalSizeMB: 0
          };
        }
      });

      // Calculate total stats
      const totalStats = Object.values(stats).reduce((acc, folderStats) => ({
        fileCount: acc.fileCount + folderStats.fileCount,
        totalSize: acc.totalSize + folderStats.totalSize,
        totalSizeMB: acc.totalSizeMB + folderStats.totalSizeMB
      }), { fileCount: 0, totalSize: 0, totalSizeMB: 0 });

      res.json({
        success: true,
        data: {
          byFolder: stats,
          total: totalStats
        }
      });

    } catch (error) {
      console.error('Get upload stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UploadController();
