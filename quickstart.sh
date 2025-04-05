#!/bin/bash

# ANSI color codes for styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Function to display banner
show_banner() {
    echo
    # Colors from the SVG
    M1='\033[1;31m'  # Red
    E1='\033[1;38;5;208m'  # Orange
    M2='\033[1;33m'  # Yellow
    ZERO='\033[1;32m'  # Green
    M3='\033[1;34m'  # Blue
    C='\033[1;35m'  # Purple
    P='\033[1;38;5;213m'  # Pink
    
    # MEM0-MCP logo extracted from SVG
    echo -e "${M1}███╗   ███╗${E1}███████╗${M2}███╗   ███╗${ZERO} ██████╗ ${M3}███╗   ███╗${C} ██████╗${P}██████╗ ${RESET}"
    echo -e "${M1}████╗ ████║${E1}██╔════╝${M2}████╗ ████║${ZERO}██╔═══██╗${M3}████╗ ████║${C}██╔════╝${P}██╔══██╗${RESET}"
    echo -e "${M1}██╔████╔██║${E1}█████╗  ${M2}██╔████╔██║${ZERO}██║   ██║${M3}██╔████╔██║${C}██║     ${P}██████╔╝${RESET}"
    echo -e "${M1}██║╚██╔╝██║${E1}██╔══╝  ${M2}██║╚██╔╝██║${ZERO}██║   ██║${M3}██║╚██╔╝██║${C}██║     ${P}██╔═══╝ ${RESET}"
    echo -e "${M1}██║ ╚═╝ ██║${E1}███████╗${M2}██║ ╚═╝ ██║${ZERO}╚██████╔╝${M3}██║ ╚═╝ ██║${C}╚██████╗${P}██║     ${RESET}"
    echo -e "${M1}╚═╝     ╚═╝${E1}╚══════╝${M2}╚═╝     ╚═╝${ZERO} ╚═════╝ ${M3}╚═╝     ╚═╝${C} ╚═════╝${P}╚═╝     ${RESET}"
    
    echo -e "\n${YELLOW}${BOLD}✨ Persistent Memory for LLMs ✨${RESET}\n"
}

# Function to generate MCP JSON configuration
generate_config() {
    echo -e "${CYAN}${BOLD}Generate MCP Configuration${RESET}\n"
    echo -e "This will create a configuration for your mcp.json file.\n"

    # Get OPENAI API Key
    echo -e "${CYAN}OPENAI API Key (required):${RESET}"
    read -s OPENAI_API_KEY
    echo

    # Get User ID
    echo -e "${CYAN}Default User ID (e.g., 'username', 'project-name', or 'conversation-1'):${RESET}"
    read DEFAULT_USER_ID
    if [ -z "$DEFAULT_USER_ID" ]; then
        DEFAULT_USER_ID="user"
    fi

    # Get Run ID
    echo -e "${CYAN}Run ID / Session ID (e.g., 'coding-session', 'project-xyz', or 'conversation-1'):${RESET}"
    read RUN_ID
    if [ -z "$RUN_ID" ]; then
        RUN_ID="session-$(date +%Y%m%d)"
    fi

    # Ask if they want in-memory or Qdrant storage
    echo -e "${CYAN}Choose storage type:${RESET}"
    echo -e "1. ${BOLD}In-memory storage${RESET} (ephemeral, no persistence)"
    echo -e "2. ${BOLD}Qdrant database${RESET} (persistent storage using Docker)"
    echo -ne "\n${CYAN}Choose an option (1-2):${RESET} "
    read storage_choice
    echo
    
    # Get the current directory where the script is running
    CURRENT_DIR=$(pwd)
    
    # Generate a complete mcp.json configuration
    echo -e "\n${YELLOW}${BOLD}Configuration for mcp.json:${RESET}\n"
    echo -e "${BLUE}"
    
    # Create the environment variables section based on chosen configuration
    ENV_SECTION='{
        "OPENAI_API_KEY": "'${OPENAI_API_KEY}'",
        "DEFAULT_USER_ID": "'${DEFAULT_USER_ID}'",
        "RUN_ID": "'${RUN_ID}'"'    
    # Close the environment section
    ENV_SECTION="${ENV_SECTION}"'
      }'
    
    # Output the full configuration
    cat << EOF
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "node",
      "args": [
        "${CURRENT_DIR}/dist/index.js"
      ],
      "env": ${ENV_SECTION},
      "disabled": false,
      "alwaysAllow": [
        "add_memory",
        "search_memory"
      ]
    }
  }
}
EOF
    echo -e "${RESET}\n"
    echo -e "${GREEN}${BOLD}✅ Copy the above JSON to your mcp.json file${RESET}\n"
}

# Main function - show menu and handle user selection
main() {
    show_banner

    while true; do
        echo -e "${CYAN}${BOLD}Mem0-MCP Management Menu${RESET}\n"
        echo -e "1. ${BOLD}Generate mcp.json Config${RESET}"
        echo -e "2. ${BOLD}View README.md${RESET}"
        echo -e "3. ${BOLD}Restart Mem0-MCP${RESET}"
        
        
        echo -e "7. ${BOLD}Exit${RESET}"
        
        echo -ne "\n${CYAN}Choose an option (1-3):${RESET} "
        read choice
        echo
        
        case $choice in
            1) generate_config ;;
            2) view_readme ;;
            3) echo -e "${GREEN}Goodbye!${RESET}"; exit 0 ;;
            *) echo -e "${RED}Invalid option. Please try again.${RESET}\n" ;;
        esac
        
        echo -e "\nPress Enter to return to menu..."
        read
        clear
        show_banner
    done
}

# Run the main function
main 