import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import './TemplateCreator.css';

const TemplateCreator = () => {
  const navigate = useNavigate();
  const [selectedFields, setSelectedFields] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState('identity');
  
  // Refs for each category section
  const categoryRefs = useRef({});

  // Category definitions
  const categories = {
    identity: {
      title: '📋 IDENTITY & INVENTORY',
      fields: ['_id', 'acno', 'accession', 'acp', 'sd unique', 'ivt', 'sd moved', 'sd new', 'whynull', 'm transfer history', 'acimpt', 'e quant', 'e units', 'e cform', 'e plants collected']
    },
    geography: {
      title: '🌍 GEOGRAPHY & ORIGIN',
      fields: ['e locality', 'loc1', 'loc2', 'loc3', 'loc4', 'e location field', 'e location greenhouse', 'e origin country', 'e origin province', 'e origin city', 'e origin address 1', 'e origin address 2', 'e origin postal code', 'e lath', 'e latd', 'e latm', 'e lons', 'e lond', 'e lonm', 'e lats', 'e elev', 'e habitat', 'site', 'taxno', 'sitecmt']
    },
    biology: {
      title: '🧬 BIOLOGY & TAXONOMY',
      fields: ['e genus', 'e species', 'e subspecies', 'cultivar_name', 'plant type', 'family', 'e pedigree']
    },
    people: {
      title: '👥 PEOPLE & CUSTODIANS',
      fields: ['e collector', 'e breeder', 'e breeder or collector', 'e origin institute']
    },
    status: {
      title: '📅 STATUS & DATES',
      fields: ['distribute', 'status', 'e alive', 'statcmt', 'uniform', 'e released', 'e datefmt', 'e date collected']
    },
    metadata: {
      title: '📝 DESCRIPTIVE METADATA',
      fields: ['cmt', 'e cmt', 'images', 'Citation', 'Literature', 'Narrative']
    }
  };

  // Default fields that cannot be unchecked
  const defaultFields = [
    'acno', 
    'accession', 
    'cultivar_name', 
    'e origin country', 
    'e origin province', 
    'e origin city', 
    'e pedigree', 
    'e genus', 
    'e species'
  ];

  // Initialize with default fields selected
  useEffect(() => {
    setSelectedFields(new Set(defaultFields));
  }, []);

  // Back to Create Apple handler
  const handleBackToCreateApple = () => {
    navigate('/create-apple');
  };

  // Scroll to category when clicked
  const scrollToCategory = (categoryKey) => {
    setActiveCategory(categoryKey);
    categoryRefs.current[categoryKey]?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start',
      inline: 'nearest'
    });
  };

  const handleCheckboxChange = (field) => {
    // Prevent unchecking default fields
    if (defaultFields.includes(field)) {
      return;
    }

    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleDownload = () => {
    if (selectedFields.size === 0) {
      alert('Please select at least one field!');
      return;
    }

    // Create array of selected fields in order
    const orderedFields = [];
    Object.values(categories).forEach(category => {
      category.fields.forEach(field => {
        if (selectedFields.has(field)) {
          orderedFields.push(field);
        }
      });
    });

    // Create workbook with headers
    const wb = XLSX.utils.book_new();
    const wsData = [orderedFields];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    // Download file
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `AppleVerse_Template_${timestamp}.xlsx`);
  };

  return (
    <div className="template-creator">
      {/* Back Button */}
      <button 
        className="back-to-create-btn"
        onClick={handleBackToCreateApple}
      >
        <ArrowLeft size={20} />
        Back to Create Apple
      </button>

      <div className="template-header">
        <h1>Template Creator</h1>
        <div className="subtitle-list">
          <div className="subtitle">• Customize your data collection template</div>
          <div className="subtitle">• Select the fields you need for your project</div>
          <div className="subtitle">• Download ready-to-use Excel templates</div>
        </div>
      </div>

      <div className="template-divider"></div>

      <div className="template-content">
        <div className="categories-sidebar">
          <h3>Categories</h3>
          {Object.entries(categories).map(([key, category]) => (
            <div 
              key={key} 
              className={`category-label ${activeCategory === key ? 'active' : ''}`}
              onClick={() => scrollToCategory(key)}
            >
              {category.title}
            </div>
          ))}
        </div>

        <div className="fields-section">
          <h3>Select Fields</h3>
          {Object.entries(categories).map(([key, category]) => (
            <div 
              key={key} 
              className="category-group"
              ref={el => categoryRefs.current[key] = el}
            >
              <div className="category-title">{category.title}</div>
              <div className="checkbox-grid">
                {category.fields.map(field => {
                  const isDefault = defaultFields.includes(field);
                  const isChecked = selectedFields.has(field);
                  
                  return (
                    <label 
                      key={field} 
                      className={`checkbox-item ${isDefault ? 'default' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCheckboxChange(field)}
                        disabled={isDefault}
                      />
                      <span className="checkbox-label">
                        {field}
                        {isDefault && <span className="default-badge">DEFAULT</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="template-footer">
        <button className="download-btn" onClick={handleDownload}>
          📥 Submit and Download Template
        </button>
        <p className="info-text">* Orange fields are required and will be included by default</p>
      </div>
    </div>
  );
};

export default TemplateCreator;