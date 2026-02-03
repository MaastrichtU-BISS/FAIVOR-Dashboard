# FAIVOR Model Metadata JSON - Examples & Validation Tests

## Example 1: Minimal Valid JSON (Required Fields Only)

```json
{
  "General Model Information": {
    "Title": {
      "@value": "Minimal Model"
    },
    "Editor Note": {
      "@value": "A model with only required fields"
    },
    "FAIRmodels image name": {
      "@value": "ghcr.io/maastrichtu-biss/faivor-models/minimal:v1.0.0"
    }
  },
  "Input data": [
    {
      "Input label": {
        "@value": "age"
      },
      "Description": {
        "@value": "Patient age in years"
      },
      "Type of input": {
        "@value": "numeric"
      },
      "Input feature": {
        "rdfs:label": "http://example.org/age"
      }
    }
  ],
  "Outcome label": {
    "@value": "diagnosis"
  }
}
```

**When loaded:**
```python
metadata = ModelMetadata(minimal_json)
print(metadata.validate())  # True

print(metadata.model_name)      # "Minimal Model"
print(metadata.docker_image)    # "ghcr.io/maastrichtu-biss/faivor-models/minimal:v1.0.0"
print(len(metadata.inputs))     # 1
print(metadata.output)          # "diagnosis"
```

---

## Example 2: Cardiovascular Risk Model

```json
{
  "General Model Information": {
    "Title": {
      "@value": "10-Year Cardiovascular Risk Calculator"
    },
    "Editor Note": {
      "@value": "Predicts risk of cardiovascular event (heart attack or stroke) within 10 years using Framingham Risk Score methodology"
    },
    "Created by": {
      "@value": "Dr. Sarah Johnson, PhD, Cardiology Department"
    },
    "Contact email": {
      "@value": "s.johnson@heartinstitute.org"
    },
    "FAIRmodels image name": {
      "@value": "ghcr.io/heartinstitute/cvd-risk-model:v3.2.1"
    },
    "References to papers": [
      {
        "@value": "https://doi.org/10.1161/01.cir.104.14.1694"
      },
      {
        "@value": "https://doi.org/10.1371/journal.pmed.1000058"
      }
    ]
  },
  "Input data": [
    {
      "Input label": {
        "@value": "age"
      },
      "Description": {
        "@value": "Patient age in years at screening"
      },
      "Type of input": {
        "@value": "numeric"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/397669002"
      }
    },
    {
      "Input label": {
        "@value": "gender"
      },
      "Description": {
        "@value": "Biological sex: M=male, F=female"
      },
      "Type of input": {
        "@value": "categorical"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/263495000"
      }
    },
    {
      "Input label": {
        "@value": "systolic_bp"
      },
      "Description": {
        "@value": "Systolic blood pressure in mmHg (measured or average of 3 measurements)"
      },
      "Type of input": {
        "@value": "numeric"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/271649006"
      }
    },
    {
      "Input label": {
        "@value": "total_cholesterol"
      },
      "Description": {
        "@value": "Total serum cholesterol in mg/dL"
      },
      "Type of input": {
        "@value": "numeric"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/365629008"
      }
    },
    {
      "Input label": {
        "@value": "hdl_cholesterol"
      },
      "Description": {
        "@value": "HDL cholesterol in mg/dL"
      },
      "Type of input": {
        "@value": "numeric"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/13645005"
      }
    },
    {
      "Input label": {
        "@value": "smoking_status"
      },
      "Description": {
        "@value": "Current smoker: 0=no, 1=yes"
      },
      "Type of input": {
        "@value": "binary"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/77176002"
      }
    },
    {
      "Input label": {
        "@value": "diabetes_status"
      },
      "Description": {
        "@value": "Diabetes diagnosis: 0=no, 1=yes"
      },
      "Type of input": {
        "@value": "binary"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/73211009"
      }
    }
  ],
  "Outcome label": {
    "@value": "cardiovascular_event_10yr"
  },
  "Output data": {
    "Output label": {
      "@value": "10-Year CVD Risk Probability"
    },
    "Description": {
      "@value": "Probability of major cardiovascular event (myocardial infarction or stroke) within 10 years"
    },
    "Type of output": {
      "@value": "probability"
    },
    "Output feature": {
      "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/371627002"
    }
  },
  "Model Performance": {
    "Training population": {
      "@value": "Framingham Heart Study (1971-1998 follow-up)"
    },
    "Training sample size": {
      "@value": "4433"
    },
    "Evaluation metrics": {
      "sensitivity": {
        "@value": "0.78"
      },
      "specificity": {
        "@value": "0.74"
      },
      "accuracy": {
        "@value": "0.76"
      },
      "auroc": {
        "@value": "0.79"
      }
    }
  },
  "Model Framework": {
    "Framework": {
      "@value": "Logistic Regression"
    },
    "Model architecture": {
      "@value": "Linear model with interaction terms"
    },
    "Hyperparameters": {
      "@value": "Coefficients derived from Framingham cohort analysis"
    }
  },
  "Known Limitations": [
    {
      "@value": "Developed in predominantly white, middle-class population; may not apply to other ethnicities"
    },
    {
      "@value": "Does not account for family history of early CVD"
    },
    {
      "@value": "Not validated in patients with established cardiovascular disease"
    },
    {
      "@value": "Does not consider emerging risk factors (lipoprotein(a), high-sensitivity CRP)"
    },
    {
      "@value": "Assumes stable risk factor values over 10-year period"
    }
  ],
  "Fairness Metrics": {
    "Group disparities": {
      "Male": {
        "@value": "0.79"
      },
      "Female": {
        "@value": "0.78"
      },
      "Age 40-49": {
        "@value": "0.75"
      },
      "Age 50-59": {
        "@value": "0.81"
      }
    }
  },
  "Model DOI": {
    "@value": "10.21384/cvd-risk-model-001"
  },
  "Model License": {
    "@value": "CC-BY-NC-4.0"
  }
}
```

---

## Example 3: Cancer Detection Model (Complex)

```json
{
  "General Model Information": {
    "Title": {
      "@value": "Breast Cancer Detection from Mammography (Deep Learning)"
    },
    "Editor Note": {
      "@value": "Convolutional Neural Network trained on CBIS-DDSM mammography dataset. Detects malignant lesions with high sensitivity for clinical screening support."
    },
    "Created by": {
      "@value": "Dr. Michael Chen, MD, PhD; Dr. Lisa Wang, PhD"
    },
    "Contact email": {
      "@value": "m.chen@cancercenter.org"
    },
    "FAIRmodels image name": {
      "@value": "ghcr.io/cancercenter/breast-cancer-ai:v2.0.0"
    },
    "References to papers": [
      {
        "@value": "https://doi.org/10.1148/radiol.2018180760"
      },
      {
        "@value": "https://doi.org/10.1038/s41467-019-11698-5"
      }
    ]
  },
  "Input data": [
    {
      "Input label": {
        "@value": "mammogram_image"
      },
      "Description": {
        "@value": "Mammography image in PNG format, 224x224 pixels, normalized to [0,1]"
      },
      "Type of input": {
        "@value": "image"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/71651007"
      }
    },
    {
      "Input label": {
        "@value": "age"
      },
      "Description": {
        "@value": "Patient age in years"
      },
      "Type of input": {
        "@value": "numeric"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/397669002"
      }
    },
    {
      "Input label": {
        "@value": "family_history_breast_cancer"
      },
      "Description": {
        "@value": "Family history: 0=no, 1=yes"
      },
      "Type of input": {
        "@value": "binary"
      },
      "Input feature": {
        "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/160303001"
      }
    }
  ],
  "Outcome label": {
    "@value": "malignancy_prediction"
  },
  "Output data": {
    "Output label": {
      "@value": "Malignancy Probability"
    },
    "Description": {
      "@value": "Probability that lesion is malignant (0.0-1.0)"
    },
    "Type of output": {
      "@value": "probability"
    },
    "Output feature": {
      "rdfs:label": "http://purl.bioontology.org/ontology/SNOMEDCT/399068003"
    }
  },
  "Model Performance": {
    "Training population": {
      "@value": "CBIS-DDSM Mammography Dataset"
    },
    "Training sample size": {
      "@value": "1431 cases"
    },
    "Evaluation metrics": {
      "sensitivity": {
        "@value": "0.94"
      },
      "specificity": {
        "@value": "0.87"
      },
      "accuracy": {
        "@value": "0.91"
      },
      "precision": {
        "@value": "0.92"
      },
      "f1_score": {
        "@value": "0.93"
      },
      "auroc": {
        "@value": "0.96"
      }
    }
  },
  "Model Framework": {
    "Framework": {
      "@value": "PyTorch"
    },
    "Framework version": {
      "@value": "2.0.1"
    },
    "Model architecture": {
      "@value": "ResNet50 with custom head"
    },
    "Pretrained weights": {
      "@value": "ImageNet-pretrained encoder"
    }
  },
  "Dependencies": [
    {
      "Package name": {
        "@value": "torch"
      },
      "Package version": {
        "@value": "2.0.1"
      }
    },
    {
      "Package name": {
        "@value": "torchvision"
      },
      "Package version": {
        "@value": "0.15.2"
      }
    },
    {
      "Package name": {
        "@value": "numpy"
      },
      "Package version": {
        "@value": "1.24.0"
      }
    },
    {
      "Package name": {
        "@value": "Pillow"
      },
      "Package version": {
        "@value": "9.5.0"
      }
    }
  ],
  "Known Limitations": [
    {
      "@value": "Higher false positive rate in dense breast tissue"
    },
    {
      "@value": "Not validated in male patients with gynecomastia"
    },
    {
      "@value": "Performance may degrade with non-standard mammography equipment"
    },
    {
      "@value": "Does not detect micro-calcifications smaller than 1mm"
    },
    {
      "@value": "Requires radiologist review - not for autonomous decision-making"
    }
  ],
  "Fairness Metrics": {
    "Demographic parity": {
      "@value": "0.89"
    },
    "Group disparities": {
      "Age 40-50": {
        "@value": "0.93"
      },
      "Age 51-65": {
        "@value": "0.91"
      },
      "Age 65+": {
        "@value": "0.88"
      },
      "Dense tissue": {
        "@value": "0.85"
      },
      "Non-dense tissue": {
        "@value": "0.94"
      }
    }
  },
  "Model DOI": {
    "@value": "10.21384/breast-cancer-detect-001"
  },
  "Model License": {
    "@value": "CC-BY-NC-SA-4.0"
  },
  "Regulatory Information": {
    "FDA status": {
      "@value": "In development - not FDA approved"
    },
    "Clinical trial": {
      "@value": "NCT04567498"
    },
    "Regulatory pathway": {
      "@value": "510(k) submission planned Q2 2026"
    }
  }
}
```

---

## Python Validation Tests

```python
import json
from pathlib import Path
from model_metadata import ModelMetadata, ModelInput

def test_minimal_json():
    """Test loading minimal valid JSON"""
    minimal = {
        "General Model Information": {
            "Title": {"@value": "Test Model"},
            "Editor Note": {"@value": "Test"},
            "FAIRmodels image name": {"@value": "ghcr.io/test/model:v1"}
        },
        "Input data": [
            {
                "Input label": {"@value": "feature1"},
                "Type of input": {"@value": "numeric"}
            }
        ],
        "Outcome label": {"@value": "target"}
    }
    
    metadata = ModelMetadata(minimal)
    assert metadata.validate() == True
    assert metadata.model_name == "Test Model"
    assert len(metadata.inputs) == 1
    print("✓ Minimal JSON test passed")

def test_missing_required_field():
    """Test that missing required fields raise errors"""
    incomplete = {
        "General Model Information": {
            "Title": {"@value": "Test"}
        },
        # Missing "FAIRmodels image name"
        "Input data": [],
        "Outcome label": {"@value": "target"}
    }
    
    try:
        metadata = ModelMetadata(incomplete)
        assert metadata.validate() == False
        print("✓ Missing field validation test passed")
    except Exception as e:
        print(f"✓ Correctly caught error: {e}")

def test_type_validation():
    """Test type validation for ModelInput"""
    try:
        # This should fail - input_label must be string
        invalid_input = ModelInput(
            input_label=123,  # Should be string
            description="Test"
        )
    except TypeError as e:
        print(f"✓ Type validation test passed: {e}")

def test_json_file_loading():
    """Test loading from JSON file"""
    json_path = Path("model_metadata_schema.json")
    
    with open(json_path, 'r') as f:
        metadata_dict = json.load(f)
    
    metadata = ModelMetadata(metadata_dict)
    
    assert metadata.validate() == True
    assert metadata.model_name == "Diabetes Risk Prediction Model"
    assert metadata.docker_image == "ghcr.io/maastrichtu-biss/faivor-models/diabetes-risk:v2.1.0"
    assert len(metadata.inputs) == 10
    assert metadata.author == "Dr. John Smith, Maastricht University"
    
    print("✓ JSON file loading test passed")
    print(f"  - Model: {metadata.model_name}")
    print(f"  - Docker: {metadata.docker_image}")
    print(f"  - Inputs: {len(metadata.inputs)}")
    print(f"  - Author: {metadata.author}")

def test_model_input_parsing():
    """Test ModelInput parsing"""
    input_data = {
        "Input label": {"@value": "age"},
        "Description": {"@value": "Patient age"},
        "Type of input": {"@value": "numeric"},
        "Input feature": {"rdfs:label": "http://example.org/age"}
    }
    
    input_feature = ModelInput(
        input_label=input_data["Input label"]["@value"],
        description=input_data["Description"]["@value"],
        data_type=input_data["Type of input"]["@value"],
        rdfs_label=input_data["Input feature"]["rdfs:label"]
    )
    
    assert input_feature.input_label == "age"
    assert input_feature.data_type == "numeric"
    print("✓ ModelInput parsing test passed")

def test_json_repr():
    """Test JSON representation"""
    json_path = Path("model_metadata_schema.json")
    
    with open(json_path, 'r') as f:
        metadata_dict = json.load(f)
    
    metadata = ModelMetadata(metadata_dict)
    json_str = repr(metadata)
    
    # Should be valid JSON
    parsed = json.loads(json_str)
    assert parsed["model_name"] == "Diabetes Risk Prediction Model"
    print("✓ JSON representation test passed")

if __name__ == "__main__":
    test_minimal_json()
    test_missing_required_field()
    test_type_validation()
    test_json_file_loading()
    test_model_input_parsing()
    test_json_repr()
    print("\n✅ All tests passed!")
```

---

## Data Type Reference

### Input Data Types
- `numeric` - Continuous/float values (age, weight, measurements)
- `categorical` - Discrete categories (gender, stage, type)
- `binary` - 0/1 boolean values
- `text` - Free text strings
- `image` - Image data (for computer vision models)
- `datetime` - Date/time values

### Output Types
- `probability` - [0, 1] for classification
- `classification` - Class label (disease, healthy)
- `regression` - Continuous prediction value
- `risk_score` - Risk stratification
- `survival` - Survival prediction time

### Common SNOMED CT Codes

| Clinical Term | SNOMED CT URI |
|---|---|
| Age | http://purl.bioontology.org/ontology/SNOMEDCT/397669002 |
| Body Mass Index | http://purl.bioontology.org/ontology/SNOMEDCT/60621009 |
| Blood Glucose | http://purl.bioontology.org/ontology/SNOMEDCT/34284009 |
| Systolic BP | http://purl.bioontology.org/ontology/SNOMEDCT/271649006 |
| Diastolic BP | http://purl.bioontology.org/ontology/SNOMEDCT/271650006 |
| Total Cholesterol | http://purl.bioontology.org/ontology/SNOMEDCT/365629008 |
| HDL Cholesterol | http://purl.bioontology.org/ontology/SNOMEDCT/13645005 |
| Triglycerides | http://purl.bioontology.org/ontology/SNOMEDCT/12100004 |
| Smoking Status | http://purl.bioontology.org/ontology/SNOMEDCT/77176002 |
| Diabetes | http://purl.bioontology.org/ontology/SNOMEDCT/73211009 |

---

**Version**: 1.0  
**Date**: February 3, 2026

