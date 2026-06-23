# Use the official .NET SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the solution file and restore dependencies
COPY *.sln ./
COPY Hanora/Hanora.csproj Hanora/
COPY Services/Services.csproj Services/
COPY DataAccessObjects/DataAccessObjects.csproj DataAccessObjects/
COPY Repositories/Repositories.csproj Repositories/
COPY BusinessObjects/BusinessObjects.csproj BusinessObjects/

RUN dotnet restore

# Copy the remaining files and build the app
COPY . ./
WORKDIR /src/Hanora
RUN dotnet publish -c Release -o /app/publish

# Use the official .NET runtime image to run the app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install Tesseract OCR native libraries for Linux
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    libtesseract-dev \
    libleptonica-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/lib/x86_64-linux-gnu/libtesseract.so.5 /usr/lib/x86_64-linux-gnu/libtesseract50.so || true
RUN ln -s /usr/lib/x86_64-linux-gnu/libleptonica.so.5 /usr/lib/x86_64-linux-gnu/liblept153.so || true
RUN mkdir -p /app/x64 && \
    ln -s /usr/lib/x86_64-linux-gnu/libtesseract.so.5 /app/x64/libtesseract50.so || true && \
    ln -s /usr/lib/x86_64-linux-gnu/libleptonica.so.5 /app/x64/liblept153.so || true

COPY --from=build /app/publish .

# Expose the port your application will run on (Railway uses PORT environment variable, which ASP.NET Core respects, but we can set 8080 as a fallback)
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

ENTRYPOINT ["dotnet", "Hanora.dll"]
