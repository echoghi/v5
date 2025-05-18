#!/bin/bash

# Check and install dependencies
check_and_install_dependencies() {
    # Check for pip
    if ! command -v pip &> /dev/null; then
        echo "pip is not installed. Please install Python and pip first."
        exit 1
    fi

    # Check for fonttools and brotli
    if ! python3 -c "import fontTools" &> /dev/null || ! python3 -c "import brotli" &> /dev/null; then
        echo "Installing required Python packages..."
        pip install fonttools brotli
    fi
}


SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
# Directory containing your build files
BUILD_DIR="$REPO_ROOT/dist"
# Directory containing your fonts
FONTS_DIR="$REPO_ROOT/public/fonts"
# Output directory for subsetted fonts
SUBSET_DIR="$REPO_ROOT/public/fonts"

# Create subset directory if it doesn't exist
mkdir -p "$SUBSET_DIR"

# Function to extract text content from files
extract_text() {
    # Extract text from HTML, JS, CSS files
    find "$BUILD_DIR" -type f \( -name "*.html" -o -name "*.js" -o -name "*.css" \) -exec cat {} + | \
    # Remove HTML tags
    sed 's/<[^>]*>//g' | \
    # Remove special characters but keep unicode
    tr -cd '[:alnum:][:space:][:punct:]\\u0080-\\uffff' | \
    sort -u > /tmp/text_content.txt
}

# Create subsets for each font
create_subset() {
    local font=$1
    local basename=$(basename "$font")
    local output="$SUBSET_DIR/${basename%.*}.subset.${basename##*.}"
    
    echo "Creating subset for $basename..."
    
    pyftsubset "$font" \
        --output-file="$output" \
        --text-file=/tmp/text_content.txt \
        --layout-features='*' \
        --flavor=woff2 \
        --desubroutinize
        
    echo "Created subset font: $output"
    
    # Print size comparison
    original_size=$(stat -f %z "$font")
    subset_size=$(stat -f %z "$output")
    echo "Original size: $(($original_size/1024))KB"
    echo "Subset size: $(($subset_size/1024))KB"
    echo "Reduction: $((100-($subset_size*100/$original_size)))%"
}

# Main process
echo "Checking dependencies..."
check_and_install_dependencies

echo "Cleaning up old subset fonts..."
find "$SUBSET_DIR" -type f -name "*subset*" -delete

echo "Extracting text content from build..."
extract_text

echo "Creating font subsets..."
for font in "$FONTS_DIR"/*.woff2; do
    create_subset "$font"
done

echo "Cleanup..."
rm /tmp/text_content.txt

echo "Done! Subsetted fonts are in $SUBSET_DIR"