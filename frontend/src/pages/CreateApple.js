import React, { useState } from 'react'; 
import './CreateApple.css';
import axios from 'axios';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, FileImage, CheckCircle, AlertCircle } from 'lucide-react';

export default function CreateApple() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [imagesZip, setImagesZip] = useState(null);
  const [extractedImages, setExtractedImages] = useState([]);
  const [matchedData, setMatchedData] = useState([]);
  const [unmatchedImages, setUnmatchedImages] = useState([]);
  const [unmatchedApples, setUnmatchedApples] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualMatches, setManualMatches] = useState({});

  // Statistics
  const [stats, setStats] = useState({
    matched: 0,
    unmatchedImages: 0,
    unmatchedApples: 0
  });

  // Back to start
  const handleBackToStart = () => {
    setStep(0);
    setCsvFile(null);
    setCsvData([]);
    setImagesZip(null);
    setExtractedImages([]);
    setMatchedData([]);
    setUnmatchedImages([]);
    setUnmatchedApples([]);
    setError('');
    setManualMatches({});
    setStats({ matched: 0, unmatchedImages: 0, unmatchedApples: 0 });
  };

  // STEP 1: Handle CSV Upload
  const handleCsvChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('Only CSV or Excel files are allowed.');
      setCsvFile(null);
      return;
    }

    setError('');
    setCsvFile(file);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('Please select a CSV or Excel file to upload.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const text = await csvFile.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (!parsed.data || parsed.data.length === 0) {
        setError('The file is empty or has no valid data. Please upload a file with content.');
        setLoading(false);
        return;
      }

      // Validate that there's at least a cultivar name column
      const firstRow = parsed.data[0];
      const hasCultivarName = Object.keys(firstRow).some(key => 
        key.toLowerCase().includes('cultivar') || 
        key.toLowerCase().includes('name')
      );

      if (!hasCultivarName) {
        setError('CSV must contain a cultivar name column (e.g., "cultivar_name", "name")');
        setLoading(false);
        return;
      }

      setCsvData(parsed.data);
      console.log('✅ CSV parsed:', parsed.data.length, 'rows');
      
      // Automatically move to Step 2
      setStep(2);
    } catch (err) {
      console.error('❌ CSV parse error:', err);
      setError('Failed to parse CSV file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Handle ZIP Upload
  const handleZipChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Only ZIP files are allowed for image upload.');
      setImagesZip(null);
      return;
    }

    setError('');
    setImagesZip(file);
  };

  const handleMatchImages = async () => {
    if (!imagesZip) {
      setError('Please select a ZIP file containing images.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(imagesZip);
      
      const imageFiles = [];
      for (const [filename, file] of Object.entries(contents.files)) {
        if (!file.dir && /\.(jpg|jpeg|png|gif|bmp)$/i.test(filename)) {
          const blob = await file.async('blob');
          const cleanFilename = filename.split('/').pop();
          imageFiles.push({
            name: cleanFilename,
            blob: blob,
            url: URL.createObjectURL(blob)
          });
        }
      }

      if (imageFiles.length === 0) {
        setError('No valid image files found in the ZIP.');
        setLoading(false);
        return;
      }

      console.log('✅ Extracted images:', imageFiles.length);
      setExtractedImages(imageFiles);

      // Match images to apples
      performMatching(imageFiles);
      
      // Move to Step 3
      setStep(3);
    } catch (err) {
      console.error('❌ ZIP extraction error:', err);
      setError('Failed to extract ZIP file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const performMatching = (images) => {
    const matched = [];
    const unmatchedImgs = [];
    const unmatchedApps = [];

    // Get cultivar name field
    const cultivarField = Object.keys(csvData[0]).find(key => 
      key.toLowerCase().includes('cultivar') || 
      key.toLowerCase().includes('name')
    );

    csvData.forEach(apple => {
      const cultivarName = apple[cultivarField];
      if (!cultivarName) return;

      // Try to find matching image (case-insensitive, fuzzy matching)
      const cleanCultivar = cultivarName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      
      const matchedImage = images.find(img => {
        const cleanImgName = img.name.toLowerCase().replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '').replace(/[^a-z0-9]/g, '');
        return cleanImgName.includes(cleanCultivar) || cleanCultivar.includes(cleanImgName);
      });

      if (matchedImage) {
        matched.push({
          apple: apple,
          image: matchedImage,
          cultivarName: cultivarName
        });
      } else {
        unmatchedApps.push({
          apple: apple,
          cultivarName: cultivarName
        });
      }
    });

    // Find unmatched images
    const matchedImageNames = matched.map(m => m.image.name);
    unmatchedImgs.push(...images.filter(img => !matchedImageNames.includes(img.name)));

    setMatchedData(matched);
    setUnmatchedImages(unmatchedImgs);
    setUnmatchedApples(unmatchedApps);

    setStats({
      matched: matched.length,
      unmatchedImages: unmatchedImgs.length,
      unmatchedApples: unmatchedApps.length
    });

    console.log('📊 Matching complete:', {
      matched: matched.length,
      unmatchedImages: unmatchedImgs.length,
      unmatchedApples: unmatchedApps.length
    });
  };

  // Handle manual matching
  const handleManualMatch = (appleIndex, imageName) => {
    const newMatches = { ...manualMatches };
    newMatches[appleIndex] = imageName;
    setManualMatches(newMatches);

    // Update stats
    const manualMatchCount = Object.keys(newMatches).filter(k => newMatches[k]).length;
    setStats(prev => ({
      ...prev,
      unmatchedApples: unmatchedApples.length - manualMatchCount
    }));
  };

  // STEP 3: Save to Database
  const handleSaveToDatabase = async () => {
    setLoading(true);
    
    try {
      // Combine matched data with manual matches
      const finalData = [...matchedData];
      
      unmatchedApples.forEach((item, index) => {
        if (manualMatches[index]) {
          const selectedImage = extractedImages.find(img => img.name === manualMatches[index]);
          if (selectedImage) {
            finalData.push({
              apple: item.apple,
              image: selectedImage,
              cultivarName: item.cultivarName
            });
          }
        }
      });

      console.log('💾 Saving to database:', finalData.length, 'entries');

      // Create FormData for upload
      const formData = new FormData();
      
      finalData.forEach((item, index) => {
        // Add apple data with index notation
        formData.append(`apples[${index}]`, JSON.stringify(item.apple));
        
        // Add image blob (all use same field name 'images')
        if (item.image && item.image.blob) {
          formData.append('images', item.image.blob, item.image.name);
        }
      });

      // Debug: Check FormData contents
      console.log('📋 FormData contents:');
      for (let pair of formData.entries()) {
        console.log(pair[0], ':', pair[1] instanceof Blob ? `Blob: ${pair[1].size} bytes` : pair[1].substring(0, 100) + '...');
      }

      console.log('📤 Sending to backend:', finalData.length, 'items');

      // Send to backend
      const response = await axios.post('http://localhost:5000/api/apples/bulk-upload-with-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Upload response:', response.data);
      alert(`🎉 Successfully uploaded ${response.data.stats.successful} apple(s) with images!`);
      
      // Reset and go back to start
      handleBackToStart();
      
    } catch (err) {
      console.error('❌ Save error:', err);
      alert(`❌ Error: ${err.response?.data?.message || err.message || 'Save failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-apple-container">
      <h1 className="page-title">Create New Apple Resource 🍎</h1>

      {/* Timeline */}
      <div className="timeline">
        {['Choose Method', 'Upload CSV', 'Upload Images', 'Review & Save'].map((label, idx) => (
          <div key={idx} className={`timeline-step ${step === idx ? 'active' : ''} ${step > idx ? 'completed' : ''}`}>
            <div className="circle">{step > idx ? '✓' : idx + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="step-content-card">
        
        {/* STEP 0: CHOOSE METHOD */}
        {step === 0 && (
          <div className="step">
            <h2>Choose Upload Method</h2>
            <div className="instructions-card">
              <h3>How to Use</h3>
              <ul>
                <li>Choose <b>Single Upload</b> to manually enter apple details and upload images</li>
                <li>Choose <b>Multiple Upload</b> to upload CSV/Excel with bulk images</li>
                <li>Use <b>Download Template</b> to create templates for bulk upload</li>
              </ul>
            </div>

            <div className="upload-options">
              <button
                className="upload-btn single"
                onClick={() => navigate('/single-apple')}
              >
                Single Upload
              </button>

              <button
                className="upload-btn multiple"
                onClick={() => setStep(1)} 
              >
                Multiple Upload
              </button>

              <button
                className="upload-btn template"
                onClick={() => navigate('/template-creator')}
              >
                Download Template
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD CSV */}
        {step === 1 && (
          <div className="step">
            <h2><FileSpreadsheet size={28} /> Upload Your CSV</h2>
            <div className="instructions-card">
              <h3>Upload Instructions</h3>
              <ul>
                <li>Only <b>.csv</b> or <b>.xlsx/.xls</b> files are accepted</li>
                <li>File must contain cultivar names</li>
                <li>Each row should contain complete apple information</li>
                <li>File must not be empty</li>
              </ul>
            </div>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleCsvChange}
            />

            {csvFile && (
              <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
                <p style={{ color: '#2e7d32', margin: 0, fontWeight: '600' }}>
                  ✓ Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}

            {error && (
              <p style={{ color: 'red', fontWeight: '500', marginTop: '10px' }}>
                ⚠️ {error}
              </p>
            )}

            <div className="navigation-buttons">
              <button className="btn-secondary" onClick={handleBackToStart}>
                <ArrowLeft size={18} />
                Back
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCsvUpload}
                disabled={!csvFile || loading}
              >
                {loading ? '⏳ Processing...' : <><Upload size={18} /> Upload CSV</>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: UPLOAD IMAGES */}
        {step === 2 && (
          <div className="step">
            <h2><FileImage size={28} /> Upload Your Images</h2>
            <div className="instructions-card">
              <h3>Image Upload Instructions</h3>
              <ul>
                <li>Upload a <b>.zip</b> file containing all images</li>
                <li>Images should be named to match cultivar names from CSV</li>
                <li>Supported formats: <b>JPG, PNG, GIF, BMP</b></li>
                <li>System will automatically match images to cultivars</li>
              </ul>
            </div>

            <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#1565c0', fontWeight: '600' }}>
                ✓ CSV Uploaded: {csvData.length} cultivars loaded
              </p>
            </div>

            <input
              type="file"
              accept=".zip"
              onChange={handleZipChange}
            />

            {imagesZip && (
              <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
                <p style={{ color: '#2e7d32', margin: 0, fontWeight: '600' }}>
                  ✓ Selected: {imagesZip.name} ({(imagesZip.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}

            {error && (
              <p style={{ color: 'red', fontWeight: '500', marginTop: '10px' }}>
                ⚠️ {error}
              </p>
            )}

            <div className="navigation-buttons">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={18} />
                Back
              </button>
              <button 
                className="btn-primary" 
                onClick={handleMatchImages}
                disabled={!imagesZip || loading}
                style={{ background: 'linear-gradient(135deg, #4caf50, #66bb6a)' }}
              >
                {loading ? '⏳ Processing...' : <>🔍 Match Images to Apples</>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & SAVE */}
        {step === 3 && (
          <div className="step">
            <h2><CheckCircle size={28} /> Review and Save</h2>
            
            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#4caf50' }}>{stats.matched}</div>
                <div style={{ color: '#2e7d32', fontWeight: '600' }}>✓ Matched</div>
              </div>
              <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#ff9800' }}>{stats.unmatchedImages}</div>
                <div style={{ color: '#e65100', fontWeight: '600' }}>⚠ Unmatched Images</div>
              </div>
              <div style={{ background: '#ffebee', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#f44336' }}>{unmatchedApples.length - Object.keys(manualMatches).filter(k => manualMatches[k]).length}</div>
                <div style={{ color: '#c62828', fontWeight: '600' }}>⚠ Unmatched Apples</div>
              </div>
            </div>

            {/* Manual Matching Section */}
            {unmatchedApples.length > 0 && (
              <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ color: '#e65100', marginBottom: '15px' }}>
                  <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Manual Matching Required
                </h3>
                <p style={{ marginBottom: '15px', color: '#555' }}>
                  The following cultivars need images. Please select from unmatched images:
                </p>
                
                {unmatchedApples.map((item, index) => (
                  <div key={index} style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                    <strong>{item.cultivarName}</strong>
                    <select
                      value={manualMatches[index] || ''}
                      onChange={(e) => handleManualMatch(index, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '10px',
                        borderRadius: '6px',
                        border: '2px solid #e0e0e0',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">-- Select Image --</option>
                      {unmatchedImages.map((img, imgIndex) => (
                        <option key={imgIndex} value={img.name}>{img.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Matched Preview */}
            {matchedData.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#4caf50', marginBottom: '15px' }}>✓ Successfully Matched ({matchedData.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {matchedData.slice(0, 6).map((item, index) => (
                    <div key={index} style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <img src={item.image.url} alt={item.cultivarName} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                      <div style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>{item.cultivarName}</div>
                    </div>
                  ))}
                  {matchedData.length > 6 && (
                    <div style={{ background: '#e0e0e0', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' }}>
                      +{matchedData.length - 6} more
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="navigation-buttons">
              <button className="btn-secondary" onClick={handleBackToStart}>
                <ArrowLeft size={18} />
                Start Over
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSaveToDatabase}
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #4caf50, #66bb6a)' }}
              >
                {loading ? '⏳ Saving...' : <>💾 Save to Database</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}