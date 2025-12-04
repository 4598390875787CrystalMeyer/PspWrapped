// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PspWrapped is SepoliaConfig {
    struct EncryptedListeningData {
        uint256 userId;
        euint32 encryptedSongId;
        euint32 encryptedArtistId;
        euint32 encryptedGenreId;
        euint32 encryptedPlayCount;
        euint32 encryptedDuration;
        uint256 timestamp;
    }

    struct WrappedReport {
        euint32 topSongId;
        euint32 topArtistId;
        euint32 topGenreId;
        euint32 totalPlayCount;
        euint32 totalListeningTime;
        bool isGenerated;
    }

    struct DecryptedReport {
        uint32 topSongId;
        uint32 topArtistId;
        uint32 topGenreId;
        uint32 totalPlayCount;
        uint32 totalListeningTime;
        bool isRevealed;
    }

    mapping(uint256 => EncryptedListeningData[]) private userListeningData;
    mapping(uint256 => WrappedReport) private encryptedReports;
    mapping(uint256 => DecryptedReport) private decryptedReports;
    
    uint256 public userCount;
    mapping(address => uint256) public addressToUserId;
    
    event DataUploaded(uint256 indexed userId, uint256 dataCount);
    event ReportGenerated(uint256 indexed userId);
    event DecryptionRequested(uint256 indexed userId);
    event ReportRevealed(uint256 indexed userId);

    function registerUser() public returns (uint256) {
        require(addressToUserId[msg.sender] == 0, "User already registered");
        userCount++;
        addressToUserId[msg.sender] = userCount;
        return userCount;
    }

    function uploadEncryptedData(
        euint32[] memory songIds,
        euint32[] memory artistIds,
        euint32[] memory genreIds,
        euint32[] memory playCounts,
        euint32[] memory durations,
        uint256[] memory timestamps
    ) public {
        uint256 userId = addressToUserId[msg.sender];
        require(userId != 0, "User not registered");
        require(songIds.length == artistIds.length, "Array length mismatch");

        for (uint256 i = 0; i < songIds.length; i++) {
            userListeningData[userId].push(EncryptedListeningData({
                userId: userId,
                encryptedSongId: songIds[i],
                encryptedArtistId: artistIds[i],
                encryptedGenreId: genreIds[i],
                encryptedPlayCount: playCounts[i],
                encryptedDuration: durations[i],
                timestamp: timestamps[i]
            }));
        }

        emit DataUploaded(userId, songIds.length);
    }

    function generateWrappedReport() public {
        uint256 userId = addressToUserId[msg.sender];
        require(userId != 0, "User not registered");
        require(userListeningData[userId].length > 0, "No listening data");

        EncryptedListeningData[] storage data = userListeningData[userId];
        
        euint32 topSongId = data[0].encryptedSongId;
        euint32 topArtistId = data[0].encryptedArtistId;
        euint32 topGenreId = data[0].encryptedGenreId;
        euint32 maxPlayCount = data[0].encryptedPlayCount;
        euint32 totalPlayCount = data[0].encryptedPlayCount;
        euint32 totalListeningTime = data[0].encryptedDuration;

        for (uint256 i = 1; i < data.length; i++) {
            // Update top song if current has more plays
            ebool isNewTopSong = FHE.gt(data[i].encryptedPlayCount, maxPlayCount);
            topSongId = FHE.select(isNewTopSong, data[i].encryptedSongId, topSongId);
            topArtistId = FHE.select(isNewTopSong, data[i].encryptedArtistId, topArtistId);
            topGenreId = FHE.select(isNewTopSong, data[i].encryptedGenreId, topGenreId);
            maxPlayCount = FHE.select(isNewTopSong, data[i].encryptedPlayCount, maxPlayCount);

            // Accumulate totals
            totalPlayCount = FHE.add(totalPlayCount, data[i].encryptedPlayCount);
            totalListeningTime = FHE.add(totalListeningTime, data[i].encryptedDuration);
        }

        encryptedReports[userId] = WrappedReport({
            topSongId: topSongId,
            topArtistId: topArtistId,
            topGenreId: topGenreId,
            totalPlayCount: totalPlayCount,
            totalListeningTime: totalListeningTime,
            isGenerated: true
        });

        decryptedReports[userId] = DecryptedReport({
            topSongId: 0,
            topArtistId: 0,
            topGenreId: 0,
            totalPlayCount: 0,
            totalListeningTime: 0,
            isRevealed: false
        });

        emit ReportGenerated(userId);
    }

    function requestReportDecryption() public {
        uint256 userId = addressToUserId[msg.sender];
        require(userId != 0, "User not registered");
        require(encryptedReports[userId].isGenerated, "Report not generated");
        require(!decryptedReports[userId].isRevealed, "Already revealed");

        WrappedReport storage report = encryptedReports[userId];
        
        bytes32[] memory ciphertexts = new bytes32[](5);
        ciphertexts[0] = FHE.toBytes32(report.topSongId);
        ciphertexts[1] = FHE.toBytes32(report.topArtistId);
        ciphertexts[2] = FHE.toBytes32(report.topGenreId);
        ciphertexts[3] = FHE.toBytes32(report.totalPlayCount);
        ciphertexts[4] = FHE.toBytes32(report.totalListeningTime);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptReport.selector);
        emit DecryptionRequested(userId);
    }

    function decryptReport(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 userId = addressToUserId[msg.sender];
        require(userId != 0, "User not registered");
        require(encryptedReports[userId].isGenerated, "Report not generated");
        require(!decryptedReports[userId].isRevealed, "Already revealed");

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32[] memory results = abi.decode(cleartexts, (uint32[]));
        
        decryptedReports[userId] = DecryptedReport({
            topSongId: results[0],
            topArtistId: results[1],
            topGenreId: results[2],
            totalPlayCount: results[3],
            totalListeningTime: results[4],
            isRevealed: true
        });

        emit ReportRevealed(userId);
    }

    function getDecryptedReport(uint256 userId) public view returns (
        uint32 topSongId,
        uint32 topArtistId,
        uint32 topGenreId,
        uint32 totalPlayCount,
        uint32 totalListeningTime,
        bool isRevealed
    ) {
        require(userId != 0, "Invalid user ID");
        DecryptedReport storage report = decryptedReports[userId];
        return (
            report.topSongId,
            report.topArtistId,
            report.topGenreId,
            report.totalPlayCount,
            report.totalListeningTime,
            report.isRevealed
        );
    }

    function getUserDataCount(uint256 userId) public view returns (uint256) {
        return userListeningData[userId].length;
    }
}