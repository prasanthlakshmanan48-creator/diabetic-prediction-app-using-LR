import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score


# =========================
# FILE PATHS
# =========================

DATASET_PATH = "diabetes.csv"

MODEL_FOLDER = "model"

MODEL_PATH = os.path.join(
    MODEL_FOLDER,
    "diabetes_model.pkl"
)


# =========================
# DATASET COLUMNS
# =========================

FEATURES = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age"
]

TARGET = "Outcome"


# =========================
# TRAIN MODEL
# =========================

def train_model():

    print("=" * 50)
    print("INTELLIGENT DIABETES PREDICTION SYSTEM")
    print("=" * 50)

    # Check dataset
    if not os.path.exists(DATASET_PATH):

        print("ERROR: diabetes.csv not found.")

        return

    print("\nLoading dataset...")

    data = pd.read_csv(
        DATASET_PATH
    )

    print("Dataset loaded successfully.")

    print(
        "Dataset shape:",
        data.shape
    )

    print(
        "Columns:",
        list(data.columns)
    )


    # =========================
    # CHECK COLUMNS
    # =========================

    required_columns = (
        FEATURES + [TARGET]
    )

    missing_columns = [
        column
        for column in required_columns
        if column not in data.columns
    ]

    if missing_columns:

        print(
            "\nERROR: Missing columns:"
        )

        print(
            missing_columns
        )

        print(
            "\nExpected columns:"
        )

        print(
            required_columns
        )

        return


    # =========================
    # INPUT AND OUTPUT
    # =========================

    X = data[FEATURES]

    y = data[TARGET]


    # =========================
    # TRAIN / TEST SPLIT
    # =========================

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y
        )
    )


    # =========================
    # MACHINE LEARNING PIPELINE
    # =========================

    model = Pipeline([

        (
            "scaler",
            StandardScaler()
        ),

        (
            "classifier",
            LogisticRegression(
                max_iter=1000
            )
        )

    ])


    # =========================
    # TRAIN
    # =========================

    print("\nTraining machine learning model...")

    model.fit(
        X_train,
        y_train
    )


    # =========================
    # TEST
    # =========================

    predictions = model.predict(
        X_test
    )

    accuracy = accuracy_score(
        y_test,
        predictions
    )


    print(
        f"\nModel Accuracy: "
        f"{accuracy * 100:.2f}%"
    )


    # =========================
    # CREATE MODEL FOLDER
    # =========================

    os.makedirs(
        MODEL_FOLDER,
        exist_ok=True
    )


    # =========================
    # SAVE MODEL
    # =========================

    joblib.dump(
        model,
        MODEL_PATH
    )


    print(
        "\nModel saved successfully!"
    )

    print(
        "Model location:"
    )

    print(
        os.path.abspath(
            MODEL_PATH
        )
    )

    print(
        "\nYou can now run:"
    )

    print(
        "python app.py"
    )

    print("=" * 50)


# =========================
# START
# =========================

if __name__ == "__main__":

    train_model()