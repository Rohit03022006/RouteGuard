FROM maven:3.8.8-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=build /workspace/target/demo-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8082
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8082
ENTRYPOINT ["sh","-c","java -jar app.jar --server.port=${SERVER_PORT}"]
